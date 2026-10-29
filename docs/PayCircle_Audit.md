# PayCircle — Full Code Audit

Audit of `frontend/` (~12.4k lines) and `backend/` (~2.7k lines), read in full.
Goal: get from "working prototype" to close-to-industry quality.

Severity: **P0** = broken/crashing · **P1** = device stability (handheld) · **P2** = logic/data
correctness · **P3** = security & production readiness · **P4** = performance · **P5** = quality

Every item below was verified against the source. Line references are the current `update_1.01` branch.

---

## P0 — Broken or crashing

### 1. Creating a group is 100% broken ⚠️ biggest bug in the app
- Frontend sends `{ name }` only — `app/(tabs)/groups.jsx:273`
- Backend requires both — `backend/src/controllers/groupController.js:134`
  ```js
  if (!name || !type) return res.status(400)... 'Name and type are required'
  ```
- **Every** "Create Group" attempt fails with that message. The group-type selector
  (`GROUP_TYPES`, `typeGrid`, `typeChip` styles) exists in `groups.jsx` but is never rendered.
- Fix: render the type picker and send `type`, or default `type` server-side (the model already
  defaults to `Miscellaneous`).

### 2. Deleting a personal contact orphans every reference to it
- `contactController.js` `deleteContact` hard-deletes the `User` document.
- That id is still referenced by `Group.members`, `Expense.payerId`, `Expense.splits.userId`,
  `DirectSplit`, `Settlement`, `DirectSettle`.
- Consequences: `populate('members')` yields `null` entries, so `getMembers`
  (`groupController.js:209`, `m._id.toString()`) throws → **500**; balances show "Unknown";
  the confirmation dialog literally promises "Their split history will be kept" but the payer
  name is gone.
- Fix: soft-delete (`deletedAt`/`isArchived`), or refuse deletion while references exist.

### 3. ~~Adding a group member renders a broken row~~ — RETRACTED, not a bug
- On re-check before fixing: `groupController.addMember` already returns
  `{ id, name, email, upiId, isVirtual, role: 'Member' }`, which is exactly the shape
  `fetchAll` maps members to. The shapes match; there is no bug here.
- Left in place so the numbering below stays stable.

### 4. Dashboard sparkline: wrong days, and a crash path
- `app/(tabs)/index.jsx:204-212` buckets by `new Date(tx.date).toISOString().slice(0,10)` — **UTC**,
  while the bar labels come from `getDay()` — **local**. For IST (+5:30) every transaction before
  05:30 lands in the previous day's bucket. India-only app, so this is always wrong, not an edge case.
- `.toISOString()` on an invalid date throws `RangeError` → unhandled → **white screen** on the
  whole dashboard.
- Fix: bucket on local `getFullYear()/getMonth()/getDate()`, and guard `isNaN(d.getTime())`.

### 5. `styles.modalOverlay` is declared twice in one StyleSheet
- `app/(tabs)/groups.jsx:1144` and `:1289`. The second wins, and it **lacks
  `justifyContent: 'flex-end'`**.
- So the Create Group bottom sheet renders at the **top** of the screen instead of the bottom.
- Fix: rename one (`addGroupOverlay` / `filterOverlay`).

### 6. Help & FAQ / About / Privacy modals clip their Close button
- `app/(tabs)/profile.jsx:167` — `<ScrollView style={{ flex: 0 }}>` inside a sheet capped at
  `maxHeight: '82%'` with `overflow: 'hidden'`.
- `flex: 0` sets `flexShrink: 0`, so the ScrollView keeps its full content height and overflows the
  sheet; the clipped region takes the Close button with it, and the list doesn't scroll.
  Worst on Help & FAQ (6 long items).
- Fix: remove `style={{ flex: 0 }}`.

### 7. QR scanner permission screen is unusable
- `app/qr-scanner.jsx:184` uses `styles.btnPrimary` (which has `flex: 1`, designed for the
  horizontal `sheetActions` row) inside `styles.centered`, a **column** → the "Allow Camera"
  button stretches to fill all remaining vertical space.
- Same bug at `:248`: `btnSecondary` (`flex: 1`) inside the auto-height `retryWrap` → the
  "Try Again" button can collapse to zero height.
- Fix: separate button styles, or wrap in a row / give explicit sizing.

### 8. Add Member modal refetches in a loop
- `app/groups/[id].jsx:1377` passes `existingMemberIds={members.map(m => m.id)}` — a **new array
  identity on every parent render** — and `:505` has it in the effect deps.
- Every parent re-render while the modal is open re-runs `getFriends()` + `getContacts()`, resets
  the tab to `friends`, and flashes the spinner.
- Fix: pass a stable value (`useMemo`, or a joined string key).

### 9. Editing a custom-split amount corrupts the balance
- `directSplitController.js` `updateDirectSplit` sets `split.amount` but leaves `payerShare` untouched.
- `EditSplitSheet` only sends `amount`. If the split had `payerShare: 800` on `amount: 1000` and the
  user edits the amount to 500, `payerShare` stays 800 → `theirShare = 500 - 800 = -300` →
  **negative share, silently wrong balance** in every direct-balance calculation.
- Fix: rescale `payerShare` proportionally, or clamp/reset it when `amount` changes.

### 10. Direct splits show as green income on the dashboard
- `dashboardController.js` recent-activity mapping:
  ```js
  { amount: s.amount, sign: iAm ? 1 : -1 }   // direct_split
  ```
- Two bugs: `sign: 1` when you *paid* (the frontend renders `sign === 1` as `+₹` in green), and
  `amount` is the **full** split, not your share — unlike `group_expense` directly above it, which
  correctly uses `split?.amount`.
- So paying ₹500 for a shared lunch appears as **+₹500 income**.
- Fix: `amount: myShare`, `sign: -1` (your share is always an expense).

### 11. Session expiry leaves the user stuck
- `services/api.js` 401 handler calls `removeToken()` but never clears `AuthContext` state, so
  `user` stays set and `RootGuard` never redirects. The user sits on screens whose every request
  now fails, with no path to the login screen.
- Fix: expose a logout callback to the interceptor (or an auth event emitter).

### 12. Loading skeletons are invisible
- `app/(tabs)/index.jsx:396-399` — `loadingHeader` is `flexDirection: 'row'`, and `Skeleton`
  sets only `height` (no `width`/`flex`), so both skeletons are **zero-width** in a row container.
- Fix: `flex: 1` on the skeleton, or drop `flexDirection: 'row'`.

---

## P1 — Handheld device stability

This is the cluster that matters most for "stable on all hand-held devices". `app.json` sets
`"edgeToEdgeEnabled": true`, which means **the app draws under the system bars on Android** — but
nothing in the codebase reads safe-area insets. `useSafeAreaInsets` appears **zero** times.

### 13. Tab bar collides with the system navigation bar
- `app/(tabs)/_layout.jsx` — `tabBarStyle: { height: 64, paddingBottom: 10 }`, fixed.
- With edge-to-edge + gesture nav (most modern Androids) the bottom inset is 16–48dp, so labels and
  icons sit under the gesture pill / nav buttons.
- Fix: `height: 64 + insets.bottom`, `paddingBottom: 10 + insets.bottom`.

### 14. Every modal leaves an undimmed band at the top (Android)
- 21 `<Modal>` usages; **none** passes `statusBarTranslucent` (or `navigationBarTranslucent`).
- The dim backdrop stops below the status bar → a visible light strip above every sheet and dialog.
- Fix: add `statusBarTranslucent navigationBarTranslucent` to all of them (`AppAlert` included).

### 15. Bottom-sheet actions sit under the gesture bar
- Every sheet uses a hardcoded guess instead of insets:
  `transactions.jsx` (`<View style={{height:20}}/>`), `groups.jsx` (`paddingBottom: 40`),
  `profile.jsx` (`28`), `BudgetSetupSheet` (`32`), `contacts.jsx` (`36`),
  `UpiQrModal` (`24`), `direct/[friendId].jsx` pay modal (`24`), `groups/[id].jsx` modals (`20`).
- On 3-button-nav Androids (48dp) the primary CTA is partially covered.
- Fix: `paddingBottom: Math.max(24, insets.bottom + 16)`.

### 16. Android keyboard covers inputs and CTAs
- Six places use `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` — i.e. **no keyboard
  handling at all on Android**: `auth/login.jsx:81`, `auth/register.jsx:112`,
  `transactions.jsx:241`, `contacts.jsx:108`, `groups.jsx:295`, `BudgetSetupSheet:135`,
  `EditSplitSheet:72`.
- Under edge-to-edge, Android's `adjustResize` no longer reliably shrinks the window, so the sheet
  does not move.
- Worst cases:
  - **Register** — 5 fields + CTA; the bottom half is unreachable.
  - **Profile → Set Username / Add UPI ID** — bottom sheets with a `TextInput` and **no
    `KeyboardAvoidingView` at all** (`profile.jsx:604`, `:646`).
  - **Contacts → New Contact** — has `autoFocus`, so the keyboard is *guaranteed* up and the Save
    button *guaranteed* hidden.
  - **Direct → "How are you paying?"** — contains the settle-amount `TextInput`, no KAV, no
    ScrollView (`direct/[friendId].jsx:871`).
- Fix: `behavior="padding"` on both platforms for bottom-anchored sheets; add KAV + ScrollView where missing.

### 17. Sheets render at full height with a large empty gap
- RN's `ScrollView` base style is `flexGrow: 1, flexShrink: 1`. Sheets built as
  `<ScrollView style={{maxHeight: '90%'}}>` therefore **always** expand to the cap regardless of
  content: `transactions.jsx` (92%), `groups/[id].jsx` ×3 (90%).
- `EditSplitSheet` is worse — `sh.sheet` has **no `maxHeight`**, so it splits the screen with the
  `flex: 1` backdrop and lands at roughly 75% height with a void below the content.
- Fix: `flexGrow: 0` on the sheet ScrollViews; add `maxHeight` to `EditSplitSheet`.

### 18. `BudgetSetupSheet` Save button may collapse
- `BudgetSetupSheet.jsx:283` — `saveBtn: { flex: 1, height: 48 }` on a direct child of a vertical
  ScrollView's auto-height content container. `flex: 1` sets `flexBasis: 0`, which overrides
  `height` for the main axis while there is no free space to grow into.
- Fix: drop `flex: 1` (it's meaningless there; it was copied from the two-button row in `budget.jsx`).

### 19. Fixed heights + fixed font sizes clip at large system font scale
- Nothing sets `allowFontScaling={false}` or `maxFontSizeMultiplier` anywhere.
- Containers are rigid: inputs `height: 50/52/56`, buttons `46/48/52/54`, tab bar `64`,
  and chart labels with `height: 12` / `fontSize: 8` (`analytics.jsx` `monthAmt`, `dowAmt`).
- At the Android "Largest" display/font setting (×1.3–×2.0) labels and button text clip.
- Fix: `minHeight` instead of `height`, and `maxFontSizeMultiplier` on dense/decorative text.

### 20. Long numbers overflow on small screens (320–360pt)
No `numberOfLines` / `adjustsFontSizeToFit` on any currency text, and several flex wrappers are
missing `flex: 1`, so the amount pushes its sibling off-screen:
- `index.jsx:136` + `:466` — the `<View>` holding `budgetHeroAmount` (26px) / `balanceNetAmt`
  (32px) has no `flex: 1`, so a lakh-scale amount pushes the badge out of the card.
- `transactions.jsx` summary — 3 columns, ~76pt of usable width each, `fontSize: 13` monospace;
  `+₹1,00,000` does not fit.
- `groups/[id].jsx` `balanceStatVal` (16px mono, 3 columns), `budget.jsx` `overallSpent`
  (26px, `₹1,23,456 / ₹2,00,000` in ~188pt), `analytics.jsx` `srcAmt` (`width: 70`).
- Fix: `flex: 1` on the wrappers, plus `numberOfLines={1}` + `adjustsFontSizeToFit`.

### 21. `Dimensions.get('window')` captured at module scope
- `index.jsx:23` (`SCREEN_W` → `CHART_W`) and `qr-scanner.jsx:19` (`SCREEN_W`, `SCREEN_H`).
- Never updates: wrong on foldables, split-screen, and after any window resize. In the scanner the
  overlay cut-out is positioned from `SCREEN_H`, so the frame is off-centre whenever the real view
  height differs from the captured value.
- Fix: `useWindowDimensions()`.

### 22. Payment QR: overflows small screens, and may not scan
- `UpiQrModal.jsx` — `size={220}` + `quietZone 12` + `qrWrap` padding 16 + sheet padding 24×2
  = **324pt**, wider than a 320pt device.
- `color={PC.textPrimary}` on `backgroundColor={PC.bgCard}` renders a **light-on-dark (inverted)**
  QR. The QR spec expects dark modules on light; GPay/PhonePe scanners frequently refuse inverted
  codes even though ZXing tolerates them. This is the money path.
- Fix: size from `useWindowDimensions()`, and render black-on-white inside the dark card.

---

## P2 — Logical and data-correctness bugs

### 23. Money is stored as floating-point
- `Number` (float64) for every amount across all 10 models. This is why the code is littered with
  `toFixed(2)`, `Math.round(x*100)/100`, and `0.02` / `0.005` fudge tolerances
  (`expenseController:332`, `balanceService:510`, `EditSplitSheet`, `CustomSplitModal`).
- Industry practice for a finance app: store **integer paise**, or `Decimal128`.
- This is the single highest-leverage structural change, and a good viva/report talking point.

### 24. All month boundaries use server local time
- `dashboardController` (`new Date(y, m, 1)`), `budgetController.getMonthStr()`,
  `splitTagController.getMonthStr()`, `getSpendingHistory`.
- Render runs UTC; the app is IST-only. A transaction at 02:00 IST on the 1st is counted in the
  **previous** month's budget and dashboard. Budget rollover is wrong for 5½ hours every month.
- Fix: pin to `Asia/Kolkata`, or send the client's offset / month key.

### 25. Group settlements validate against the *simplified* debt list
- `settlementController.js:700-710` looks the payment up in `debts`, the output of greedy debt
  **simplification** — a minimal transfer set, not the real pairwise obligations.
- If A genuinely owes B but simplification routes "A → C", recording "A paid B" is rejected with
  *"No outstanding debt exists from this person to the receiver"* — even though the payment really
  happened. Users settling the obvious way get blocked.
- Fix: validate against raw pairwise net positions, or allow any member-to-member settlement up to
  the payer's total net debt.

### 26. Direct settlements aren't validated against the balance at all
- `directSplitController` `requestSettle` checks only `amt > 0`. Neither the personal-contact
  auto-confirm path nor the pending path compares against the outstanding balance.
- You can settle ₹10,000 against a ₹100 debt and flip the balance positive.
- Directly inconsistent with the group path (#25), which over-validates.

### 27. `max: 100000` cap on a single group expense
- `models/Expense.js` and `expenseController` (twice). Rejects legitimate rent/trip expenses.
- Inconsistent: `DirectSplit` and `PersonalTransaction` have **no** cap.

### 28. No way to delete a group expense or a settlement
- `routes/groups.js` has `post`/`get`/`patch` for expenses, `post`/`get` for settlements. No
  `DELETE` anywhere, and no UI for it.
- A mistyped expense is permanent; amount-editing is blocked entirely for `exact` splits
  (`expenseController:417`). In a shared-money app this *will* come up.

### 29. Inconsistent date validation
- `addExpense` rejects future dates and anything >1 year old; `addTransaction` accepts **any** date,
  so a personal transaction can be dated 2099 and will skew every chart.

### 30. Split tags never reach the analytics they were built for
- `SplitTag` is wired into `getBudget` (`tagMap`) but **not** into `getDashboard`, which hardcodes
  `catMap['Miscellaneous'] += myShare` for every direct split.
- So the dashboard category breakdown and the budget category breakdown disagree, and tagging a
  split changes one but not the other.

### 31. Transactions screen "Net" is wrong
- `app/(tabs)/transactions.jsx:447` — `allItems` = personal + group settlements + direct splits.
  `closedDirectSettles` is built separately (`:456`) and used **only** by the Settled tab.
- The summary card's Income/Expense/Net are computed from `allItems`, so they exclude confirmed
  direct settlements that the Settled tab does show. Two tabs, two different truths.

### 32. Login/register return a partial user
- `authController` returns only `{ id, name, email, username, walletBalance }`.
- `AuthContext.login` sets that as `user`, so immediately after signing in the Profile screen shows
  **"Add UPI ID"** even when one is set, no "Joined …" badge, and no phone. It self-heals only on
  the next app launch (which calls `/api/auth/me`).
- Fix: return the same shape as `getMe`.
- (`walletBalance` and `isVerified` are dead fields — no wallet or verification flow exists.)

### 33. `Group.members` uniqueness isn't enforced at the model level
- `addMember` checks for duplicates in application code, but nothing stops a direct/concurrent
  write from adding the same id twice — which would silently double that member's equal-split share.

### 34. Silent data loss in budget categories
- `budgetController.setCategoryBudgets` `continue`s past invalid rows instead of erroring, so a
  category with a bad name/amount just **vanishes** after save with no message.
- Same pattern in `addDirectSplit`: an out-of-range `myShare` silently falls back to 50/50
  (`ps > 0 && ps < amt`, so assigning 100% is silently ignored).

### 35. Screens don't refresh on focus
- Only `groups.jsx`, `contacts.jsx`, `groups/[id].jsx` and `direct/[friendId].jsx` use
  `useFocusEffect`. Dashboard, Transactions and Profile fetch **on mount only**.
- Add a transaction → go to Dashboard → the budget, totals and activity feed are stale until a
  manual pull-to-refresh.

### 36. iOS: opening a sheet while another closes
- `groups.jsx:801` and `:833` do `setShowActionSheet(false); setShowGroupModal(true);` in one tick.
- On iOS, presenting a modal while another is dismissing frequently drops the second one — the
  Create Group / Contact Picker sheet just doesn't appear.
- Fix: open the second after the dismiss completes (`onDismiss`, or a short `setTimeout`).

### 37. `updateDirectSplit` ignores its own route param
- Authorizes on `split.payerId === meId` but never checks that `friendId` matches the split's
  counterparty, so any of your splits can be patched through any friend's URL. Low impact (you own
  the record), but the route contract isn't enforced.

---

## P3 — Security and production readiness

### 38. No rate limiting
- `/api/auth/login` and `/api/auth/register` are unthrottled → unlimited credential stuffing.
- Fix: `express-rate-limit`, stricter on auth routes. **Table stakes for "industry level".**

### 39. `User.password` is not `select: false`
- `models/User.js`. `protect` remembers `.select('-password')`, and the populate calls do pick
  fields explicitly — so nothing leaks *today*, but the default is unsafe: one `User.find()`
  without a projection ships bcrypt hashes to the client.
- Fix: `select: false` on the field, `.select('+password')` in `login`.

### 40. Mongoose errors become 500s
- `errorHandler.js` only reads `err.statusCode`. Nothing maps:
  - `CastError` → a malformed `:id` on **any** route returns **500** instead of 400/404
  - `ValidationError` → 500 instead of 400
  - duplicate key `11000` → 500 instead of 409 (handled ad-hoc in two controllers only)
- Also: 5xx responses echo the raw `err.message`, which can leak Mongo/driver internals.
- Fix: a normalizing error mapper; generic message for 5xx in production.

### 41. CORS is misconfigured
- `cors({ origin: process.env.CLIENT_URL || '*' })` with `CLIENT_URL=http://localhost:3000` in
  `.env.example`. The RN app doesn't enforce CORS so nobody noticed, but the fallback is `*` and the
  configured value is wrong for every real client.

### 42. Missing deployment hygiene
- No `app.set('trust proxy', 1)` — behind Render's proxy `req.ip` is the proxy's, so IP logging is
  wrong and any future rate limiter would key on one IP for all users.
- No `SIGTERM` handler → in-flight requests are killed on every deploy.
- `/health` returns `success: true` even when MongoDB is down (`mongoose.connection.readyState`
  is never checked) — so the platform's health check can't detect a DB outage.
- No `compression`.
- `morgan` is a dependency but unused (already noted in `CLAUDE.md`).

### 43. Auth lifecycle gaps
- No refresh token: the 7-day JWT expires and the user is hard-logged-out mid-session.
- No revocation/blocklist — logout is purely client-side, so a stolen token stays valid.
- No password change, and **no password reset** — which is why `login.jsx:188` has a
  "Forgot password?" button with **no `onPress`** (it's a dead affordance).
- No email verification, despite `User.isVerified`.
- `api.js` timeout is `10000`ms; a cold Render free instance takes 30s+, so the first request after
  idle reliably fails. Raise it and/or add a retry.

### 44. No validation layer and no tests
- Validation is hand-rolled and duplicated in all 15 controllers, with drifting rules
  (see #27, #29). A schema layer (`zod`/`joi`) as middleware would remove most of it and make the
  rules enforceable in one place.
- **Zero tests** in either package. For an expense-splitter, `balanceService` and
  `debtSimplifier` are pure functions with obvious invariants (`sum(netBalance) === 0`,
  `sum(debts) === sum(positive balances)`) — the highest-value tests you could write, and the
  easiest thing to point at in a project report.

---

## P4 — Performance

### 45. `calculateGroupBalances` is an N+1 engine
Each call runs 4 queries (`Group.findById` + `Expense.find` + `Settlement.find` + `User.find`) and
recomputes from the full history. It is called **in a loop** from:
- `groupController.getUserGroups?includeBalances=true` — once per group
- `dashboardController.getDashboard` — once per group
- `balanceController.getUserSummary` — once per group
- `directSplitController.getGroupDebtsWithFriend` — once per shared group

A user in 10 groups pays ~40 queries for one dashboard load — and the Dashboard screen fires
dashboard + budget + transactions in parallel, while Analytics fires 4 endpoints.
- Fix: one aggregation pipeline per user, and/or a cached `balanceVersion` per group.

### 46. `getSpendingHistory` = 24 queries per call
- 6 month windows × 4 `find()` calls. Should be a single `$group`-by-month aggregation.

### 47. Nothing is paginated
- `getExpenses`, `getTransactions`, `getSettlements`, `getAllDirectSplits`,
  `getAllDirectSettlements`, `getDirectSplits`, `getAllDirectBalances` all return the **entire**
  history and recompute balances in JS. Grows unbounded.

### 48. Missing index on the hottest query
- `Group.find({ members: userId })` runs on nearly every request; `models/Group.js` declares **no
  indexes**. Add `groupSchema.index({ members: 1 })`.

### 49. Client-side N+1
- `transactions.jsx:384-398` and `groups.jsx:409-431` loop over groups issuing one
  `/settlements` (and `/balances`) request **per group** from the device. On mobile data this is the
  slowest thing in the app. Needs a single aggregated endpoint.

### 50. Animation cost
- `AnimatedBar` / `AnimBar` animate `width: '%'` with `useNativeDriver: false` — every frame
  crosses the bridge. `transform: scaleX` with the native driver is the drop-in fix.

---

## P5 — Quality, consistency, accessibility

### 51. The loaded font is never applied
- `app/_layout.jsx` set `Text.defaultProps.style = { fontFamily: 'Roboto_400Regular' }`.
  **`defaultProps` on function/forwardRef components is removed in React 19** (and RN 0.76+), so
  this was a no-op: three Roboto weights are downloaded and the splash screen waits on them, then
  the app renders in the platform default font — the exact iOS/Android mismatch the code was
  trying to prevent.
- Needs a decision: a `<PCText>` wrapper (correct, touches every screen), or drop the
  `@expo-google-fonts/roboto` dependency. **I removed the dead code but did not pick a
  replacement — see "Changes already made" below.**

### 52. Hardcoded colours (violates the project's own rule)
`CLAUDE.md` says *"Never hardcode color values — always use a `PC` token."* There are **86** hex
literals in `.jsx` files. The ones that are visibly wrong:
- `groups.jsx:688` — filter FAB icon is `"#fff"` on the mint `PC.accent` background. Every other
  on-accent element uses `#060A09`. White on `#00E5BE` is a contrast failure.
- `friends.jsx:93-94` — `BalanceChip` pill uses `rgba(74,222,128,…)` / `rgba(248,113,113,…)`
  (Tailwind green/red) while the icon and text inside use `PC.positive` / `PC.negative` — two
  different hues in one pill.
- `direct/[friendId].jsx` — `rgba(224,90,90,…)` (a pre-rebrand red) in `headerBalNeg`,
  `balBannerNeg`, `cancelChip`, `settleRejectBtn`, next to text coloured `PC.negative` (`#FF5055`).
- `rgba(148,163,184,0.12)` (slate) in the direct pay modal; `'#0A110E'`, `'#0D1512'`, `'#080E0C'`
  ad-hoc backgrounds.

### 53. Contrast below WCAG AA
- `PC.textMuted` is self-documented as *"~3.2:1 on bg"* — below the 4.5:1 AA threshold for body
  text. It's used for `tabBarInactiveTintColor`, every hint, every chart label and every timestamp.

### 54. The Android donut chart is built on an unreliable technique
- `analytics.jsx:91-120` draws pie slices as half-rects rotated inside a `borderRadius` +
  `overflow: 'hidden'` parent that is *itself* rotated.
- Android does not reliably clip transformed children to a rounded-rect outline — slices bleed
  outside the circle. `react-native-svg@15` is **already a dependency** (used by the QR code);
  a `<Path>` arc is both correct and simpler.

### 55. Three themed components exist but are bypassed
- `AppAlert` ("replaces `Alert.alert()` for confirmations") is used only in `profile.jsx`.
  Native `Alert.alert` is still used for destructive confirms in `transactions.jsx:427`,
  `contacts.jsx:195`, `friends.jsx:225/242` — a white iOS/Android dialog in the middle of a
  deliberately dark app.
- `ErrorBox` replaced the inline `errorBox` pattern, but the old `errorBox`/`errorText` styles
  remain dead in 5 files.

### 56. Dead code (~450 lines)
- **Unused modules:** `services/debtSimplifier.js` (82 lines — a *second*, better-documented copy of
  the algorithm that `balanceService` reimplements inline and nothing imports),
  `middleware/groupAuth.isAdmin` (the checks are inlined in the controllers instead).
- **Unused components/helpers:** `GroupCard`, `FriendCard`, `groupIcon` in `groups.jsx`;
  `CAT_EMOJI`, `formatDate`, `formatShortDate` in `groups/[id].jsx`; `isoMonthKey` in
  `analytics.jsx`; `recentSlice` in `index.jsx`.
- **Unused styles:** ~100 lines in `budget.jsx` (a whole duplicate of `BudgetSetupSheet`'s
  stylesheet), ~60 in `groups/[id].jsx` (`expenseCard*`, `expSplit*`, `payerTag*`, `typePill*`),
  ~40 in `direct/[friendId].jsx` (`groupDebt*`, `tagSheet*`, `tagInput*`, `tagSuggestion*`).
- **Dead model fields:** `User.walletBalance`, `User.isVerified`.

### 57. Four different `getInitials` implementations
- `index.jsx:36`, `groups.jsx:57`, `profile.jsx:28`, `friends.jsx:29`, plus `initials()` in
  `groups/[id].jsx` — each handling empty/multi-space names differently. Same for `formatDate`,
  `timeAgo`, `formatMonth`, `CATEGORY_ICONS` and `CAT_COLORS`, which are copy-pasted across 4–5
  files. These belong in `utils/`.

### 58. Components redefined every render
- `analytics.jsx:290` and `:300` declare `Header` and `TabBar` **inside** the render function →
  a new component type each render, so React unmounts and remounts them on every state change.

### 59. Error states throw away the error
- `index.jsx:419`, `transactions.jsx:544`, `analytics.jsx:335` all render a hardcoded
  "Something went wrong" while the real `error` message sits unused in state. `groups.jsx` and
  `budget.jsx` get this right — make it consistent.

### 60. No error boundary
- A single render-time exception anywhere (e.g. #4, or any `undefined.toLocaleString()`) blanks the
  entire app with no recovery. There is no `ErrorBoundary` in the tree.
- Several reachable crash paths exist because API values are assumed non-null:
  `exp.amount.toLocaleString()`, `myShare.amount.toLocaleString()`, `s.amount.toFixed(2)`,
  `myBalance.totalPaid.toLocaleString()`, `d.amount.toLocaleString()`,
  `m.netBalance.toLocaleString()` (`groups/[id].jsx`), `h.month.slice(0,4)` (`analytics.jsx:624`).
- `CategoryChart` (`index.jsx:173`) will also pass `NaN` into `Animated.timing` if any
  `breakdown[].amount` is missing, which RN rejects at runtime.

### 61. Dead UI affordances
- `login.jsx:188` "Forgot password?" — `TouchableOpacity` with no `onPress`.
- `login.jsx:231-233` "Terms" / "Privacy Policy" — styled as links, not tappable.
- Group **type** selector never rendered (#1), so every group is `Miscellaneous` — and
  `profile.jsx`'s own Help text tells users to "select a type (Roommates, Trip, Mess…)".
- No "unfriend"/remove-friend endpoint or UI; no block/report.

---

## Suggested order of work

| Step | Scope | Why |
|---|---|---|
| 1 | #1, #5, #6, #7, #12 | Visibly broken features; all small, local fixes |
| 2 | #13–#16 | Makes the app usable on real Android hardware (the stated goal) |
| 3 | #2, #9, #10, #11, #31, #32 | Silent data corruption and wrong money on screen |
| 4 | #38, #39, #40, #42 | The security/robustness baseline a reviewer will look for |
| 5 | #45, #46, #48, #49 | The app will feel slow on mobile data until these land |
| 6 | #23, #24 | Structural money/time correctness — plan as a dedicated change |
| 7 | #44 | Validation layer + tests for `balanceService`/`debtSimplifier` |
| 8 | #17–#22, #52–#61 | Polish, consistency, dead-code removal |

---

## Status

### ✅ P0 — fixed

| # | Fix | Files |
|---|---|---|
| 1 | Group type picker rendered + `type` sent; backend now defaults `type` instead of rejecting | `groups.jsx`, `groupController.js` |
| 2 | Contacts soft-delete (`User.deletedAt`) instead of hard-delete; archived contacts hidden from pickers and blocked from *new* splits but still readable/settleable; `populate()` nulls filtered so pre-existing orphans no longer 500 | `User.js`, `contactController.js`, `groupController.js`, `directSplitController.js`, `groups/[id].jsx` |
| 3 | — retracted, not a bug | — |
| 4 | Sparkline buckets by local day instead of UTC; invalid dates skipped instead of throwing | `(tabs)/index.jsx` |
| 5 | Duplicate `modalOverlay` key renamed to `filterOverlay` (confirmed gone from lint) | `groups.jsx` |
| 6 | Removed `flex: 0` from the InfoModal ScrollView | `profile.jsx` |
| 7 | Added `btnPrimarySolo` / `btnSecondarySolo` without `flex: 1` for column containers | `qr-scanner.jsx` |
| 8 | Effect depends on a stable `memberKey` string, not a fresh array | `groups/[id].jsx` |
| 9 | `payerShare` rescaled proportionally when the amount changes; explicit `payerShare` clamped to the amount | `directSplitController.js` |
| 10 | Direct splits report **my share** with `sign: -1`, matching group expenses | `dashboardController.js` |
| 11 | `setUnauthorizedHandler` lets the 401 interceptor clear auth state, so RootGuard redirects | `api.js`, `AuthContext.jsx` |
| 12 | `Skeleton` takes a `w` prop; `loadingHeader` is a column so the bars are visible | `(tabs)/index.jsx` |

Also fixed in passing: `AnimatedBar` clamps a non-finite `pct` (part of #60) — `Animated.timing`
throws on a `NaN` toValue, which a missing API amount could produce.

Earlier in the session, `frontend/app/_layout.jsx`: removed the non-functional
`Text.defaultProps` block (#51 — **decision still open**), switched the hardcoded `'#0A0A0A'`
transition colour to `PC.bg`, and moved `SplashScreen.hideAsync()` behind the auth restore.

**Verification:** backend — all files pass `node --check` and every modified module loads cleanly.
Frontend — `expo lint` went from 52 problems / 6 errors to 49 / 5, with the `Duplicate key
'modalOverlay'` error gone. The 5 remaining errors are pre-existing unescaped apostrophes in JSX.
Not yet run on a device.

### ⬜ Not started
P1 (#13–#22), P2 (#23–#37), P3 (#38–#44), P4 (#45–#50), P5 (#51–#61).

### 🔴 Reported from device testing (not yet fixed)

Found by running the app on a physical Android device after the dev-build switch.

**R1 — Root cause of R2/R3 (FIXED).** `login`/`register` returned `user: { id }` while `/me`
returns `{ _id }`, so `user._id` was `undefined` for the whole session after a fresh login and
correct only after an app restart. ~28 call sites read `user._id`; only `direct/[friendId].jsx`
had an `?? user?.id` fallback. Fixed in `authController` (now returns the `/me` shape) plus a
`normalizeUser` guard in `AuthContext`. This is audit #32, which was graded far too low.

**R2 — No add-member icon in a group (FIXED by R1).** `groups/[id].jsx:962` — `isAdmin` compared
`group.adminId._id === user._id`, so with `user._id` undefined the admin check never passed and
the header button was never rendered.

**R3 — 1-on-1 splits vanish from Transactions (FIXED by R1).** `transactions.jsx:377` —
`normalizeDirectSplit(s, undefined)` made `isPayer` false for every split, and `.filter(Boolean)`
then dropped them all. There is **no** settlement-related hiding logic; this was the cause.

**R4 — Dashboard stale after adding a 1-on-1 split (FIXED).** Dashboard fetched on mount only;
pull-to-refresh showed the correct data. Now uses `useFocusEffect`. This is audit #35.

**R5 — Sheet positioning breaks after the keyboard is dismissed (FIXED).** Reported in group
**Add Expense** and both **Custom Split** sheets: open the sheet, keyboard appears, dismiss the
keyboard, and the sheet is left mispositioned.

Exactly the five `KeyboardAvoidingView`s using `behavior={... : 'height'}` were affected; none of
the seven using `undefined` were. The AndroidManifest already sets
`windowSoftInputMode="adjustResize"`, so the OS shrinks the window itself — `'height'` made KAV
shrink *again*, and its internal height failed to restore on dismissal.

Fixed by switching all five to `undefined` on Android, matching the rest of the app:
`direct/[friendId].jsx:675,1074` and `groups/[id].jsx:165,401,705`.

> Note: audit #16 claimed `behavior={undefined}` means "no keyboard handling on Android". That
> was wrong — `adjustResize` handles it, and `undefined` is the correct value here. #16 should be
> re-verified on device rather than fixed as written.

**R6 — Same sheets render over-tall with a dead gap, no keyboard involved (FIXED).** Separate
cause from R5. These sheets are `ScrollView`s with `maxHeight: '90%'`/`'92%'`, and RN's ScrollView
base style is `flexGrow: 1, flexShrink: 1`, so they always expanded to the cap regardless of
content. `EditSplitSheet` had no `maxHeight` at all and split the screen with the `flex: 1`
backdrop (~75% tall).

Fixed with `flexGrow: 0` on `groups/[id].jsx` `modalSheet`, `transactions.jsx` `modalSheet`, and
`EditSplitSheet` `sheet` (which also gained `maxHeight: '85%'`). Covers Add Expense, Custom Split,
Record Settlement, Add Transaction and Edit Split. Audit #17.

**R7 — Cannot edit the share split, only the amount.** `EditSplitSheet` sends only
`{ amount, category }`, although `directSplitController.updateDirectSplit` already accepts
`payerShare`. Feature gap, not a regression.
