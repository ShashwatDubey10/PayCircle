# PayCircle — Complete Bug List by Category

Merged from six independent audits plus device testing on a physical Android phone.

**How this was produced.** Six agents audited the codebase in parallel, each on one category, each
reading the source fresh rather than confirming a prior pass. Their findings were then
de-duplicated and verified against the code. The business-logic pass additionally *executed* the
code paths it reports, including 40,000 randomised runs through both debt simplifiers.

**How to read it.**

- `⊕` = found independently by two or more passes. Highest confidence — act on these first.
- `🔬` = verified by executing the code, not just reading it.
- `📱` = reproduced on a real device.
- Severity is **user impact**, not theoretical risk. Reconciled where passes disagreed.

| Category | Items | Critical | High |
|---|---|---|---|
| A — Security & Authorization | 16 | 1 | 4 |
| B — Money Correctness & Data Integrity | 24 | 2 | 5 |
| C — API Contract | 14 | 1 | 3 |
| D — UI & Device Stability | 38 | 3 | 11 |
| E — Performance & Scalability | 20 | 3 | 5 |
| F — Code Quality & Maintainability | 30 | 0 | 12 |
| **Total** | **142** | **10** | **40** |

**Status as of 29 Oct 2026 — all 10 critical items are fixed on the backend.** A1 still needs a UI to trigger it, and nothing in this list has been exercised against live data.
Also fixed since this list was written: D4, D6, D9, D10, E3. Each carries a ✅ note under its
heading. Nothing below has been exercised against live data — treat "fixed" as "written and
statically verified", not "tested".

Already fixed: 11 P0 items + R1–R9, plus the ✅-marked entries throughout. See the end of this document.

---

# A — Security & Authorization

## A1 ⊕ CRITICAL — Group settlements are self-attested and permanent

> ✅ **FIXED (backend) — 29 Oct 2026.** `POST /api/groups/:id/settlements/:settlementId/reverse`. The person recorded as *receiving* the money can reverse it — they are the one who knows whether it arrived — and the group admin can as a fallback. The payer deliberately cannot undo their own claim. A reversal is an offsetting Settlement row pointing at the original via `reversalOf`, applied with the opposite sign in `computeBalances`: nothing is deleted, and both the claim and its withdrawal stay in the history. Refuses reversing a reversal or reversing twice. Verified: settle then reverse restores the balance exactly and the debt becomes payable again.
>
> **No UI yet.** The endpoint is live but nothing in the app calls it, so a reversal currently needs a direct API call.
`settlementController.js:7-48`

`recordSettlement` takes `fromUserId` from the request body and never requires it to equal
`req.user._id`. There is no confirmation step and **no DELETE route for settlements anywhere**.

A debtor can mark their own debt paid. The creditor is never asked, and cannot undo it. The 1-on-1
flow has a proper pending→confirmed handshake; the group flow has none.

> **Fix:** require `fromUserId === req.user._id`, add a creditor-confirmation state machine
> mirroring `DirectSettle`, and add a reject/delete route.

## A2 HIGH — Any member can fabricate an expense charging ~100% to someone else
`expenseController.js:10,29-31,46-61`

`payerId` comes from the body and is only checked to be *a* member. The `exact` splits array is
never required to include the authenticated user. There is no DELETE route for expenses, and
`updateExpense` is payer-only — so the victim can neither remove nor edit it.

`{amount: 100000, payerId: <me>, splitType: "exact", splits: [{<victim>, 99999.99}, {<me>, 0.01}]}`
is accepted, repeatable, and irreversible.

> **Fix:** require the caller to be the payer or a split participant; add a delete route and a
> dispute path.

## A3 ⊕ HIGH — No rate limiting anywhere
`routes/auth.js:6-7`, no limiter in `index.js`

`express-rate-limit` is not a dependency. `/api/auth/login`, `/register` and
`POST /me/contacts` are all unthrottled on a public URL. Password policy is 8 chars with a letter
and a digit. No lockout, no delay, no alerting.

> **Fix:** `express-rate-limit`, strict per-IP+per-email on `/api/auth/*`, global limiter elsewhere.

## A4 ⊕ HIGH — 7-day JWTs with no revocation
`authController.js:7`, `middleware/auth.js:17`

No `jti`, no token version, no denylist, no logout endpoint, no password-change or reset endpoint.
Nothing can invalidate an issued token; `clearAuth()` only deletes it client-side. A stolen token
is valid for up to 7 days and the victim has no available action — not even changing their
password, which does not exist.

> **Fix:** add `tokenVersion` to `User`, embed and compare it in `protect`, bump on logout and
> password change. Shorten expiry, add refresh tokens.

## A5 HIGH — Unlimited `User` document creation
`contactController.js:7-33`

`createContact` writes a real `User` per call with no per-user cap, no rate limit and no
`maxlength` on `name`, each costing a cost-10 bcrypt hash server-side. Storage and CPU exhaustion
on an Atlas free tier, and it bloats the `username` unique index.

> **Fix:** cap contacts per user, add `maxlength`, cover with the rate limiter.

## A6–A16 — Medium and low

| ID | Sev | Location | Problem |
|---|---|---|---|
| A6 ⊕ | MED | `errorHandler.js:15-16` | Raw `err.message` on 500s; full stack whenever `NODE_ENV !== 'production'`, and `.env.example` ships `NODE_ENV=development` |
| A7 ⊕ | MED | `groupAuth.js:4`, `personalTransactionController.js:65`, `contactController.js:51,69` | No `ObjectId.isValid` on path params → malformed id returns 500 + CastError internals |
| A8 | MED | `directSplitController.js:39-41` | Direct splits have no amount cap (group expenses are capped at ₹1,00,000) and no delete/dispute route |
| A9 | LOW | `services/auth.js:7-9` | JWT in AsyncStorage — unencrypted on disk. Combined with A4, a rooted device yields 7 days of access |
| A10 | LOW | `authController.js:44-52` | Registration distinguishes "email taken" from "username taken" → account enumeration oracle feeding A3 |
| A11 | LOW | `friendController.js:28`, `personalTransactionController.js:42`, `expenseController.js:95` | Repeated query params arrive as arrays → `.trim()` on array → 500 |
| A12 ⊕ | LOW | `models/User.js:18-22` | `password` lacks `select: false` (latent — no route leaks it today); `minlength: 6` contradicts the 8-char API policy |
| A13 | LOW | `index.js:13-16` | No startup validation of `JWT_SECRET`/`MONGO_URI` — an unset secret is a silent total outage |
| A14 ⊕ | LOW | `index.js:81-85` | No `trust proxy` (every logged `req.ip` is Render's proxy) and no `SIGTERM` handler |
| A15 | LOW | `index.js:32` | Redaction list omits `token` — Expo push tokens logged in clear |
| A16 | LOW | `services/api.js:20` | Dev traffic including passwords goes over plaintext `http://<lan-ip>:5000` |

**Checked and cleared** (worth knowing, to narrow the work): no cross-user IDOR on any route —
every one was walked. No NoSQL injection: Express 5 defaults `query parser` to `'simple'`, so
`req.query` cannot hold an operator object. The bcrypt hash never reaches a client on any current
path. Un-wrapped async middleware cannot crash the process, because Express 5 awaits returned
promises. Login does not leak user existence.

---

# B — Money Correctness & Data Integrity

## B1 ⊕🔬 CRITICAL — Removing a group member destroys money and corrupts everyone's balance

> ✅ **FIXED — 29 Oct 2026.** Balances key on the group's whole ledger rather than its current members (`balanceService.js`), removal is refused while a member still carries money (`groupController.js`), and `recordSettlement` accepts a former member who is still in the ledger so an already-corrupted group can be settled. Verified on the worked example above and across 2,000 randomised groups — but against stubbed models, not live Mongo.
`balanceService.js:24,27,36,37` + `groupController.js:156-160`

Balances are keyed only on **current** `group.members`. The `if (credit[pid] !== undefined)` /
`if (debit[uid] !== undefined)` guards silently discard every expense and settlement belonging to a
removed member. `removeMember` has no outstanding-balance check.

> **Worked example.** A, B, C. B pays a ₹300 expense, split equally → `A −100, B +200, C −100`
> (sums to 0). Admin removes B. Recompute: `A −100, C −100` — total **−200, not 0**. There are no
> creditors, so `debts` returns `[]`. A and C each see "you owe ₹100", and `recordSettlement`
> rejects any attempt to pay it with *"No outstanding debt exists"*. **Permanent, unpayable
> phantom debt.**

Found independently by the security and business-logic passes; the worked example was executed.

> **Fix:** key balances on the union of current members and every user appearing in the group's
> expense/settlement history, and block removal while `|netBalance| > 0.01`.

## B2 🔬 CRITICAL — Direct settlements fabricate balances out of nothing

> ✅ **FIXED — 29 Oct 2026.** `requestSettle` caps the amount at the outstanding balance and refuses a settle in a direction where nothing is owed. The client clamps the field as you type.
`directSplitController.js:183-201, 207-224`

`requestSettle` validates only `amount > 0`. It never compares against the pair's actual balance,
it accepts a client-supplied `fromContact` flag that **chooses the direction of the transfer**, and
for personal contacts it writes the row already `status: 'confirmed'` with no counterparty. Nothing
is idempotent.

> **Contact path:** `POST /me/direct/<X>/settle {amount: 5000, fromContact: true}` creates a
> confirmed settlement against a contact you owe nothing. The app now reports X owes you ₹5,000
> that never existed. Flip the flag and it fabricates the debt the other way.
>
> **Friend path:** you owe ₹100, request ₹1,000, they tap confirm → balance becomes **+₹900 in
> your favour**. Repeatable; the one-pending-at-a-time guard only blocks *simultaneous* rows.

**Severity disagreement, reconciled.** The security pass rated this "nil impact today" because the
friend path requires confirmation. The business-logic pass rated it CRITICAL with a working
exploit. Both are right in part: the contact path needs no counterparty at all and is a genuine
integrity hole, but it only corrupts your own private ledger — so it is an **integrity** critical,
not a **security** critical.

> **Fix:** compute the pair's balance server-side, derive direction from it, ignore `fromContact`,
> and reject amounts exceeding the outstanding balance.

## B3 🔬 HIGH — Nobody in India can add a group expense between 00:00 and 05:30 IST

> ✅ **FIXED — 29 Oct 2026.** The expense date check allows a 24-hour window instead of comparing strictly against the server's `now`, and the client sends a full instant rather than a bare date. Historical rows keep their wrong 5:30 am time — the bad value is already stored.
`expenseController.js:20-23`

The future-date check compares a client date-only string (parsed as **UTC midnight**) against a UTC
`now`. The server clock is 5h30m behind IST.

> At 02:00 IST on 9 Mar 2026 the server reads `2026-03-08T20:30:00Z`. The client sends
> `"2026-03-09"` → parsed `2026-03-09T00:00:00.000Z` → `expDate > now` is **true** → 400 *"Date
> cannot be in the future."* Verified by execution.

> **Fix:** compare against `now + 24h`, or interpret the incoming date in IST.

## B4 🔬 HIGH — Every month boundary is 5h30m wrong
`budgetController.js:10-13, 79-81`; `dashboardController.js:13-15, 197-203`

`getMonthStr()` and every `new Date(y, m, 1)` window use server-local time (UTC). The IST month
starts at 18:30 UTC on the last day of the previous month.

> A ₹2,000 expense at 01:00 IST on 1 March is stored `2026-02-28T19:30:00Z`, falls **outside**
> March's window and inside February's. March's budget shows ₹0 spent and the 6-month chart puts
> the spend in the February bar. Symmetrically, a budget *set* at 00:30 IST on 1 March resolves to
> `"2026-02"` and **overwrites February's budget document.** Both verified by execution.

## B5 HIGH — `myShare` of 0 or the full amount is silently discarded
`directSplitController.js:56-61`

`myShare` is honoured only when `ps > 0 && ps < amt` — excluding the two most meaningful boundary
cases. Anything outside falls back to 50/50 with a 201 success, so the client believes it applied.

> Pay ₹1,000 for something entirely your friend's (`myShare: 0`) → they owe **₹500, not ₹1,000**.

## B6 HIGH — Settlement race reverses the balance
`settlementController.js:33-48`

Read-then-write with no transaction, no idempotency key and no unique index.

> B owes A ₹100. Two taps land concurrently; both read `debts = [B→A 100]`, both insert. Result:
> `B = +100, A = −100` — **the balance is fully reversed and A now owes B ₹100.**

## B7 🔬 MED — The equal-split remainder always lands on the same person
`expenseController.js:40-45, 143-149`

Shares are rounded independently and the entire accumulated difference is assigned to the **last
element of `group.members`** — always the most recently added member.

> ₹1 across 8 people → `[0.13 ×7, 0.09]`: a 31% under-charge, for the same person, every expense.
> ₹100 across 7 → `[14.29 ×6, 14.26]`. Verified by execution.

## B8 MED — Duplicate `userId` in a split makes two screens disagree
`expenseController.js:54-61` vs `balanceService.js:25-28` vs `budgetController.js:104`

Nothing rejects `splits: [{A, 50}, {A, 50}]`. `balanceService` sums both (A owes ₹100); budget and
dashboard use `.find()` and read only the first (₹50). Same expense, two numbers.

## B9–B24 — Remaining

| ID | Sev | Location | Problem |
|---|---|---|---|
| B9 ⊕ | MED | `settlementController.js:33-38` | Validates against the *simplified* transfer list, so a genuine pairwise payment is rejected whenever simplification re-routed it |
| B10 | MED | `directSplitController.js:434-447`, `expenseController.js:134-150` | Editing an amount silently re-opens a settled debt — settlement rows stay, no notification, no audit |
| B11 | MED | `groupController.js:117-130` | `addMember` read-check-then-push race → same id twice in `members` → that member charged double share, and the duplicate debt is unassignable |
| B12 | MED | `budgetController.js:85-110`, `dashboardController.js:20-34` | Group spend selected by *current* membership — being removed retroactively deletes your past spend from the budget and every history bar |
| B13 ⊕ | MED | `dashboardController.js:61` vs `budgetController.js:130` | `SplitTag` honoured by budget, ignored by dashboard (hardcodes `Miscellaneous`) → the two screens disagree on every tagged split |
| B14 ⊕ | MED | `directSplitController.js:331` vs `dashboardController.js:109-120` | `getAllDirectBalances` skips settlements with no split rows; the dashboard counts them → friends list can't explain the dashboard's total |
| B15 | MED | `directSplitController.js:449-452` | Out-of-range `payerShare` on PATCH resets to 50/50 and reports success (₹20 debt silently becomes ₹50) |
| B16 ⊕ | MED | `expenseController.js:16,51` | `amt` never rounded to paise; exact-split tolerance ±0.02 → `sum(splits) ≠ amount`, stranding money the simplifier can never assign |
| B17 ⊕ | MED | `personalTransactionController.js:18-26` | Three money-entry endpoints, three rule sets: personal transactions have no cap, **no future-date check**, no date validity check |
| B18 | LOW | `expenseController.js:40-45` | Tiny equal splits produce a 0.00 share, violating the model's `min: 0.01` → ValidationError → **500** |
| B19 | LOW | `settlementController.js:39` | `amt > debt.amount + 0.01` lets every settlement overshoot by a paisa, flipping the sign; a pair can oscillate indefinitely |
| B20 | LOW | `budgetController.js:81`, `dashboardController.js:15,200` | Month windows end at `23:59:59.000` — the final second of every month is excluded |
| B21 | LOW | `splitTagController.js:35-50` | Read-then-`$push` race duplicates a budget category; `setCategoryBudgets` then `$set`s the whole array, wiping tag-created categories |
| B22 | LOW | `expenseController.js:101`, `personalTransactionController.js:49` | The `3m` filter uses `setMonth(-3)`, which overflows on long months (31 May → 3 Mar) |
| B23 | LOW | `dashboardController.js:182` | `netCashflow` excludes group and direct spend — ₹10,000 income with ₹9,000 of group shares displays as **+₹10,000** |
| B24 | LOW | `models/Friendship.js:14-18` | `pre('validate')` throws a bare `Error` (→ 500) where `DirectSplit.js:15-19` correctly uses `this.invalidate` (→ 400) |

**Settled by execution:** `debtSimplifier.js` and the inline simplifier in `balanceService.js`
produce **byte-identical output** across 20,000 zero-sum and 20,000 non-zero-sum random cases, and
both terminate. The code-quality pass claimed they diverge on non-zero-sum input; the empirical
result contradicts it. `debtSimplifier.js` is simply dead code and is safe to delete.

---

# C — API Contract

## C1 CRITICAL — "Assign all to →" always fails

> ✅ **FIXED — 29 Oct 2026.** `handleConfirm` omits zero-amount splits rather than sending them. The server only requires splits to sum to the amount, not one per member.
`groups/[id].jsx:377-382, 388-395` vs `expenseController.js:57-59`

`handleAssignAll` sets the chosen member to the full amount and **every other member to `'0'`**.
`handleConfirm` sends all of them. The backend rejects any split below ₹0.01, and the model
enforces the same. `isValid` only checks the leftover, so Confirm is enabled.

**The entire assign-all feature is dead** — it always returns *"Each split amount must be at least
₹0.01"*. The same breakage occurs via `handleChange` whenever redistribution drives a member to 0.

> **Fix:** filter zero-amount entries client-side, or accept `>= 0` for exact splits server-side.

## C2 HIGH — Editing an exact-split amount fails silently, with no error path at all
`groups/[id].jsx:1138, 982-999`; `EditSplitSheet.jsx:61-65` vs `expenseController.js:134-136`

`canEditAmount` is derived only from `paidByMe`, never from `splitType`. The backend hard-rejects
amount changes on exact splits. And `handleEditSave` has **no `try/catch`**, while
`EditSplitSheet.handleSave` uses `try/finally` with **no `catch`** — so the rejection becomes an
unhandled promise rejection and nothing is shown.

The payer sees an editable field; saving does nothing, with no feedback whatsoever.

## C3 HIGH — The budget sheet races itself
`BudgetSetupSheet.jsx:114-121` vs `budgetController.js:51-60`

Both POSTs fire in parallel via `Promise.all`. `setCategoryBudgets` reads the *currently persisted*
overall budget and rejects when categories exceed it. Raise the overall budget and add categories
in one save, and the categories request can read the old value and 400 — nondeterministically.

> **Fix:** `await` the overall-budget POST before sending categories.

## C4 HIGH — Notes over 200 characters return 500
`groups/[id].jsx:235-243, 824-832`, `transactions.jsx:319-327`

None of the three notes inputs has `maxLength`. All three models declare `maxlength: 200`. The
controllers never pre-validate, so Mongoose throws a `ValidationError`, which `errorHandler` maps
to **500** with a raw Mongoose message in the UI.

## C5–C14 — Remaining

| ID | Sev | Location | Problem |
|---|---|---|---|
| C5 | MED | `groups/[id].jsx:1365`, `expenseController.js:33` | "Needs ≥2 members" enforced only server-side — a 1-member group shows a full Add Expense flow that errors after everything is filled in |
| C6 | MED | `services/api.js:46-59` | The interceptor discards `error.response.status`, so no screen can distinguish "already a member" from "not authorised" from a network failure |
| C7 | MED | `contactController.js:39` | `getContacts` omits `updatedAt`, so contact rows in the chat list sort by creation date and show a stale "time ago" |
| C8 | MED | `contactController.js:39` | `upiId` not returned for contacts → the UPI QR row is permanently disabled with the message *"Ask them to add their UPI ID"*, which is impossible for a virtual contact |
| C9 | MED | `BudgetSetupSheet.jsx:61` vs `budgetController.js:41` | Budget categories are **read as `limit`** but **written as `amount`**; a `??` chain hides it until something round-trips GET output into POST |
| C10 | MED | `budgetController.js:145-148` | `GET /budget` omits `remaining`/`usagePercentage` for tracking-only categories — an undocumented polymorphic response |
| C11 ⊕ | MED | 3 endpoints vs 45 | `GET`/`POST /groups/:id/members` and `GET /groups/:id/balances` return a bare `id`; everything else returns `_id`. Works only via a hand-written remap at `groups/[id].jsx:909-918` plus `?? _id` fallbacks at ~8 sites |
| C12 | LOW | `directSplitController.js:456` | `PATCH .../splits/:splitId` returns an unpopulated split, unlike its three siblings |
| C13 | LOW | `direct/[friendId].jsx:356` vs `settlementController.js:25` | Sends a full client timestamp; a device clock running fast fails with *"date cannot be in the future"* (the group screen correctly sends date-only) |
| C14 | LOW | `personalTransactionController.js:15-22` | `type` and `category` validated independently — `{type: 'income', category: 'Food'}` is accepted and mis-bucketed downstream |

**Cleared:** every URL the frontend calls exists with the matching method — **zero latent 404s**.
Express route ordering is correct; the literal `/me/direct/settlements` and `/me/direct/balances`
are registered before the parameterised `/me/direct/:friendId`. All enum sets match on both sides.

---

# D — UI & Device Stability

Three facts frame this category: `useSafeAreaInsets` appears **0 times**,
`adjustsFontSizeToFit` **0 times**, and no currency amount anywhere has `numberOfLines`.

## D1 CRITICAL — No error boundary anywhere

> ✅ **FIXED — 29 Oct 2026.** `app/_layout.jsx` exports an `ErrorBoundary`; expo-router renders it in place of the tree, with a retry that remounts the subtree.
`app/_layout.jsx`

Zero `ErrorBoundary` in the tree. Any render throw — and there are live ones below — takes down the
whole app: red screen in dev, **blank white screen with no recovery** in production. The only
option is force-quit.

> **Fix:** `export function ErrorBoundary({ error, retry })` in `app/_layout.jsx`; expo-router
> picks it up automatically.

## D2 CRITICAL — NaN reaches style props in the analytics chart

> ✅ **FIXED — 29 Oct 2026.** `dowSpend[dow] += tx.amount ?? 0`, matching the guard the identical loop in `index.jsx` already had.
`analytics.jsx:261`

`dowSpend[dow] += tx.amount` has no `?? 0` — the identical loop in `index.jsx:216` does. One
transaction with a missing amount makes `maxDow` NaN, so every bar gets `height: NaN` and every
label renders the string "NaN". **On the New Architecture a NaN layout prop is a hard error**, and
with D1 that means the app dies.

## D3 CRITICAL — Unguarded formatting on raw API values

> ✅ **FIXED — 29 Oct 2026.** 17 field reads now go through `fmtINR` / `fmtAmount` in `utils/format.js`, which normalise null, undefined and NaN to 0. Local computed numbers were left alone.
Multiple

`.toLocaleString()` / `.toFixed()` / `.slice()` called directly on API fields. A single missing
field throws a TypeError which, per D1, kills the app. Verified sites: `groups/[id].jsx:1060, 1065,
1074, 1002, 1148, 1164, 1214, 1228, 1274, 1299, 1317-1331`; `analytics.jsx:624, 636, 640, 645`;
`index.jsx:177, 192`; `direct/[friendId].jsx:637, 892`; `UpiQrModal.jsx:73, 94`.

> **Fix:** one `fmtINR(v)` helper wrapping `Number(v ?? 0)`, used everywhere.

## D4 ⊕📱 HIGH — The keyboard problem *(partially fixed — see end)*

> ✅ **FIXED — 29 Oct 2026.** Largely fixed. Sheets are ScrollViews with padding on `contentContainerStyle` under a `behavior="padding"` KAV; the profile form sheets drive the inset from keyboard events directly, because KAV did not reset to zero under edge-to-edge. `behavior="padding"` is correct here — `undefined` was proven broken on device.
All 12 `KeyboardAvoidingView`s

`edgeToEdgeEnabled: true` suppresses Android window resizing, so `behavior={undefined}` does
nothing and `'height'` glitches on dismissal. Reproduced on device, both ways.

**Still outstanding:** three sheets have **no `KeyboardAvoidingView` at all** — Profile → Set
Username (`profile.jsx:607`), Profile → Add UPI ID (`:649`), and the direct-chat payment sheet
(`direct/[friendId].jsx:871`). Each is bottom-anchored with the Save button *below* the input and
no scroll.

## D5 ⊕ HIGH — Bottom tab bar sits inside the gesture bar
`(tabs)/_layout.jsx:21-28`

`height: 64, paddingBottom: 10` replaces the `insets.bottom` React Navigation would otherwise add.
Under edge-to-edge the labels are clipped and the bottom of each tab's hit area is stolen by the
system.

## D6 ⊕ HIGH — Every bottom-anchored control uses hardcoded padding

> ✅ **FIXED — 29 Oct 2026.** Eleven bottom-anchored surfaces now take `useSafeAreaInsets()`. Note that surfaces on a **tab screen** correctly do *not* take the inset: the tab bar sits in normal flow and already absorbs it. Only Modals and stack routes need it.
`direct/[friendId].jsx:1272` (chat input bar — the most-used screen), `groups/[id].jsx:1558` (Add
Expense FAB on a stack screen with no tab bar beneath), `qr-scanner.jsx:399, 352`,
`groups.jsx:1299, 1177, 1237, 1320`, `BudgetSetupSheet.jsx:230`, `EditSplitSheet.jsx:143`,
`UpiQrModal.jsx:142`, `profile.jsx:217`, `contacts.jsx:417`, `direct/[friendId].jsx:874`.

## D7 HIGH — Nested `<Modal>` inside `<Modal>`
`groups/[id].jsx:307-317` (CustomSplitModal inside AddExpenseModal) and `:856-867` (UpiQrModal
inside RecordSettlementModal)

On Android each `Modal` is a separate window. Nesting makes the inner backdrop, back button and
keyboard focus unreliable, and the inner sheet can render *behind* the outer one.

## D8 ⊕ HIGH — A second modal opened in the same tick as the first closes
`groups.jsx:828`, `direct/[friendId].jsx:966-972`

On Android the second modal frequently never appears — the user taps "New Group" or "Show Payment
QR" and nothing happens.

## D9 ⊕ HIGH — Filter FAB icon is effectively invisible

> ✅ **FIXED — 29 Oct 2026.** The filter FAB icon is `PC.bg`, not `#fff`. White on mint was ~1.5:1 and broke the Dark-On-Mint rule.
`groups.jsx:715`

`color="#fff"` on `PC.accent` (#00E5BE) is roughly **1.6:1** contrast. Every other on-accent
element in the app uses `#060A09`.

## D10 ⊕ HIGH — Large amounts overflow on 320–360pt screens

> ✅ **FIXED — 29 Oct 2026.** Display figures take `numberOfLines` + `adjustsFontSizeToFit`; user names truncate wherever the parent is `flex: 1`.
`budget.jsx:358`, `index.jsx:659-663`, `transactions.jsx:666`, `groups/[id].jsx:1449`,
`analytics.jsx:799`

No `numberOfLines` or `adjustsFontSizeToFit` on any of them. `budget.jsx` has ~148pt of room for a
26pt string like "₹1,00,000 / ₹1,00,000" — it wraps to three lines and breaks the card.

## D11 ⊕ HIGH — Four screens never refresh on focus
`groups.jsx:496-503` (its `useFocusEffect` only recomputes the badge), `transactions.jsx:401-414`
(doesn't even import it), `friends.jsx:199`, `profile.jsx:353`.

**`friends.jsx` is worst — it has no `RefreshControl` either**, so after adding a contact there is
no way to refresh without leaving and re-entering.

## D12–D38 — Remaining

| ID | Sev | Location | Problem |
|---|---|---|---|
| D12 | MED | `qr-scanner.jsx:19` | `Dimensions.get('window')` at module scope drives the scanner cutout; under edge-to-edge window height ≠ view height, so the frame is off-centre |
| D13 | MED | `groups/[id].jsx:20-22`, `direct/[friendId].jsx:33-35` | `LayoutAnimation` + `setLayoutAnimationEnabledExperimental` are no-ops under the New Architecture — expand/accordion snap with no animation and warn on every tap |
| D14 ⊕ | MED | `transactions.jsx:210`, `groups/[id].jsx:124, 659` | New entries use `toISOString().split('T')[0]` (UTC) — the client-side half of B3/B4. `index.jsx:62` carries a comment warning against exactly this |
| D15 | MED | `_layout.jsx:105-111` | Blocks startup on three Roboto weights used in exactly one place; if `useFonts` errors, `fontsLoaded` stays false forever and **the app hangs on the splash screen with no error** |
| D16 ⊕ | MED | 18 sites | `rgba(224,90,90,…)` used for error tints while `PC.negative` is `#FF5055` — the app visibly ships two different error reds |
| D17 ⊕ | MED | `friends.jsx:93-94` | Balance chips use Tailwind green/salmon while the icon and text inside use `PC.positive`/`PC.negative` — mint text on a green pill |
| D18 | MED | `profile.jsx:147-148` | `InfoModal` returns `null` when content clears, so the component unmounts instantly and `animationType="slide"` never plays |
| D19 ⊕ | MED | 7 inputs + `AppAlert.jsx:145` | Fixed `height` + fixed `fontSize` clip text at 2× system font scale |
| D20 ⊕ | MED | `analytics.jsx:290, 300` | `Header`/`TabBar` defined inside render → remounted on every state change |
| D21 | MED | `direct/[friendId].jsx:449, 76` | `renderItem` is a fresh closure and `Bubble` isn't memoized → every keystroke in the amount field re-renders every chat bubble |
| D22 | MED | `groups/[id].jsx:225` | `m.id === user._id` without optional chaining inside a modal, while the same component uses `user?._id` three lines up |
| D23 | MED | `budget.jsx:41-49` | Month formatter checks only `isNaN` → `"2026-13"` renders "undefined 2026" (`index.jsx:44` validates the range) |
| D24 ⊕ | MED | `UpiQrModal.jsx:87-143` | QR needs 276pt of width on a 320pt device; no `ScrollView`, so at 2× font scale the buttons are pushed off-screen |
| D25 ⊕ | MED | `index.jsx:426`, `transactions.jsx:544`, `analytics.jsx:334` | The fetched error message is stored in state and never rendered — a hardcoded string is shown instead |
| D26 | MED | `contacts.jsx:138` | `autoFocus` inside a sliding modal — the keyboard opens mid-animation, the sheet jumps |
| D27 | LOW | 58 sites | `'#060A09'` hardcoded where `PC.bg` is exactly that value |
| D28 | LOW | ~90 sites | `rgba(0,229,190,…)`, `rgba(255,80,85,…)`, `rgba(6,10,9,…)` hand-mixed alpha variants of existing tokens |
| D29 | LOW | `direct/[friendId].jsx:1234, 1269`, `groups/[id].jsx:1732` | Off-palette near-blacks (`#0D1512`, `#080E0C`, `#0A110E`) — card surfaces differ between screens |
| D30 | LOW | 6 formatters | `toLocaleDateString` with no `isNaN` guard → the literal "Invalid Date" shown to users |
| D31 | LOW | `AppToast.jsx:71` | `bottomOffset = 96` is tuned for the 64pt tab bar and wrong on the stack screens that also render it |
| D32 ⊕ | LOW | 9 sites | Native `Alert.alert` used for destructive confirms despite the themed `AppAlert` existing |
| D33 | LOW | `login.jsx:188-190, 230-234` | "Forgot password?" has no `onPress`; Terms/Privacy are styled as links but aren't tappable |
| D34 | LOW | `transactions.jsx:447` | Confirmed direct settlements are excluded from the "All" tab but included in "Settled", so the summary card contradicts the list |
| D35 | LOW | `groups.jsx:370, 381` | `pendingRequestCount` and `friendsLoading` written but never read — the friends spinner never shows |
| D36 | LOW | `register.jsx:161-221` | `inputBoxError` unreachable for 4 of 5 fields — `inputBox(field, false)` is always called with `hasError: false` |
| D37 | LOW | `groups/[id].jsx:1612`, `index.jsx:745, 749` | Empty style objects applied in 6 places with no effect |
| D38 | LOW | `profile.jsx:67, 91-99` | In-app help says "Go to the Groups tab" but the tab is labelled "Split", and describes only equal splits though `exact` exists |

---

# E — Performance & Scalability

## E1 ⊕ CRITICAL — `calculateGroupBalances` is an N+1 engine

> ✅ **FIXED — 29 Oct 2026.** `calculateBalancesForGroups` does a whole set of groups in three queries — expenses, settlements and one name lookup for the union — instead of four per group. The four loop callers (groups list, dashboard, user summary, shared-group debts) use it; two of those were sequential. `calculateGroupBalances` now also accepts an already-loaded Group document, so the three callers behind `isMember` skip the findById. The arithmetic moved unchanged into a pure `computeBalances`, re-verified against the B1 worked example and 2,000 randomised groups.
`balanceService.js:12-41`

4 queries per call (`Group.findById`, `Expense.find`, `Settlement.find`, `User.find`), invoked
once per group from **six** places: `dashboardController.js:88-94`, `groupController.js:46-58`,
`balanceController.js:21-34` (**sequential loop**), `directSplitController.js:399-413`
(**sequential loop**), `settlementController.js:33`, `balanceController.js:9`.

> A user in 10 groups triggers **~54 queries per dashboard load** — and the Dashboard now refetches
> on every tab focus. `GET /api/groups?includeBalances=true` is another 44. On Atlas M0 + Render
> free tier that is 1.5–2.5 s of pure DB latency per paint.

N of those `Group.findById` calls are pure waste — the callers already hold the group document.

> **Fix:** one batched pass — `Expense.find({groupId: {$in: ids}})` + `Settlement.find({$in})` +
> one `User.find` for the union, grouped in memory. Accept an already-loaded group document.

## E2 ⊕ CRITICAL — `Group.members` has no index

> ✅ **FIXED — 29 Oct 2026.** `groupSchema.index({ members: 1 })`. Seven call sites across the backend were doing a full collection scan.
`models/Group.js` declares **zero indexes**

`Group.find({members: userId})` runs on the dashboard, groups list, budget screen, analytics and
the direct-chat screen — a full collection scan every time, on the hottest query in the app.

> **Fix:** `groupSchema.index({ members: 1 })`. One line.

## E3 ⊕ CRITICAL — The Splits screen fires 2 HTTP requests per group

> ✅ **FIXED — 29 Oct 2026.** The per-group fan-out is gone: `/api/users/me/group-settlements` returns every settlement in one query, and the groups list carries each group's debts via `includeDebts=true`.
`groups.jsx:436-457`

Opening the Settlements panel issues `/settlements` **and** `/balances` for every group — 2N
requests, ~110 DB queries at N=10 — duplicating balances `fetchGroups` already computed via
`includeBalances=true`. On Indian mobile data plus a Render cold start: 3–6 s behind a spinner.

## E4–E20 — Remaining

| ID | Sev | Location | Problem |
|---|---|---|---|
| E4 ⊕ | HIGH | `transactions.jsx:384-398` | 1 + N requests on mount to populate the Settled tab |
| E5 ⊕ | HIGH | 9 endpoints | No pagination or limit anywhere — every list grows unbounded. `/me/transactions` is fetched by four screens per session |
| E6 | HIGH | `transactions.jsx:562`, `groups.jsx:697, 785`, `groups/[id].jsx:1111` | `ScrollView` + `.map()` over unbounded data; only the direct chat uses `FlatList`. 400 items = 400 mounted row trees, no recycling, no `React.memo` |
| E7 ⊕ | HIGH | `dashboardController.js:192-240` | `getSpendingHistory` runs 24 queries for what one `$group` aggregation returns; `budgetController` repeats the pattern |
| E8 ⊕ | HIGH | `groupController.js:84`, `balanceService.js:13`, `dashboardController.js:40-43` | Identical queries repeated within one request; `getMembers` re-fetches the group `isMember` already loaded |
| E9 | MED | `models/DirectSettle.js:11` | Index is `{fromUserId, toUserId}`, so the `{toUserId: me}` branch of the `$or` can't use it → 2 collection scans per dashboard load |
| E10 | MED | `models/Friendship.js:12` | Same shape problem on `recipient`; `getFriends` runs on every focus of four screens |
| E11 | MED | `models/User.js` | No index on `createdBy` → every contact lookup scans the whole users collection |
| E12 | MED | `models/DirectSplit.js:21-22`, `models/Settlement.js:15` | Match is indexed but the sort isn't → blocking in-memory SORT that hard-fails past 32 MB |
| E13 | MED | `balanceService.js:21, 32` | No `.select()`, no `.lean()` in the hottest path — hydrates full Mongoose docs to read three fields |
| E14 | MED | `transactions.jsx:447-471`, `groups.jsx:556-590`, `analytics.jsx:228-281` | Derived values (two full sorts over all history) recomputed on every render. `groups.jsx` does this correctly with `useMemo` two lines below |
| E15 | MED | `index.jsx:379` + `services/api.js` | Dashboard refetches everything on every focus with no cache or in-flight dedup *(introduced by the stale-data fix — see end)* |
| E16 | MED | `direct/[friendId].jsx:209-217` | Refetches all friends and all contacts on every focus purely to resolve one display name — 5 parallel requests per chat open |
| E17 | MED | `profile.jsx:328-347` | Downloads the entire transaction history to display three numbers |
| E18 | LOW | `directSplitController.js:27, 46, 178` | `canTransact` awaits two checks sequentially |
| E19 ⊕ | LOW | `index.jsx:94`, `analytics.jsx:76` | Six simultaneous `width` animations with `useNativeDriver: false`, running while the JS thread parses the dashboard response |
| E20 ⊕ | LOW | `balanceController.js:14-49` | `/me/summary` is dead but costs `2 + 4N` queries with the 4N strictly serialized |

---

# F — Code Quality & Maintainability

## F1 HIGH — No shared helper layer on the frontend

> ✅ **PARTLY FIXED — 29 Oct 2026.** Partly. `utils/format.js`, `components/text.jsx` and `components/Touchable.jsx` now exist, so a helper layer has started. Most duplication remains.

`frontend/utils/` holds one file (mostly dead); `constants/` holds one. Every formatting,
initials, category and colour decision is re-made per screen. **This is the root cause of every
duplication finding below** — a new screen has nowhere correct to import from, so it copies from a
neighbour.

> **Fix:** create `utils/format.js` and `constants/categories.js`. Collapses ~15 duplicated helpers
> into 5 and makes the convention self-enforcing.

## F2 HIGH — Duplicated helpers that have already drifted

| Helper | Copies | Divergence |
|---|---|---|
| `getInitials` | **7**, 4 distinct behaviours | `profile.jsx` and `groups/[id].jsx` omit `.filter(Boolean)` → `"Mary  Jane"` gives `"M"` not `"MJ"`. `index.jsx` returns `''` for an empty name where the others return `'?'`. `groups/[id].jsx` slices after joining, the rest before. **The same user shows different initials on different screens.** |
| Month formatting | **7** inlined arrays | `"Mar 2026"` on the dashboard, `"March 2026"` on budget. `index.jsx` validates the range; `budget.jsx` doesn't → `"2026-13"` renders "undefined 2026" |
| Category → icon | **4** maps | `Food` is `fast-food-outline` in three and `restaurant-outline` in `EditSplitSheet` → different icon in the list vs the edit sheet. `EditSplitSheet`'s labels don't overlap the backend enums at all |
| Category → colour | **2** maps | `index.jsx` is missing the `Others` key the backend emits → the same slice renders two different colours on Dashboard vs Analytics |
| `normalizeDirectSettle` | **2** | Same name, same input, **different output shape** — one adds four fields the other omits |
| `fmt` | **3** | Two functions *both named `fmt`* behaving completely differently; `₹{x.toLocaleString('en-IN')}` inlined ~45 times |
| Relative dates | **6** vocabularies | A 30-minute-old item reads "30m ago" on Split, "Just now" on Dashboard, "Today" on Friends |
| `getCatIcon` | **2**, byte-identical | Will drift the moment someone adds a keyword to one |
| Equal-split rounding | **5** (2 server, 3 client) | Any change to rounding must be made in five places or the client preview stops matching stored splits |
| `payerShare ?? amount/2` | **8** | Two backend copies use `theirShare` to mean *different things* |
| `USERNAME_RE` | **5** across both packages | |

## F3 HIGH — Three bespoke UI systems each used by one screen

`AppAlert` (used only by `profile.jsx`, despite its docblock saying it replaces `Alert.alert`),
`AppToast`/`useToast` (only `profile.jsx`), and `ErrorBox` (4 screens, while 5 others hand-roll
their own). There are **five different error presentations** for the same kind of failure, and the
money-deleting flows use the *un*-themed native dialog.

## F4 HIGH — ~646 dead lines

| Group | Lines |
|---|---|
| Dead StyleSheet keys — 118 unused keys across 6 files | **329** |
| `debtSimplifier.js` (whole file) | 82 |
| `FriendCard` + `GroupCard` (fully built, never rendered) | 69 |
| `PayWithUPIButton.jsx` + its `upiPayment.js` deep-link path | 73 |
| `getUserSummary` + route | 38 |
| `haptic-tab.jsx` | 17 |
| `services/auth.js#getUser`, `isAdmin`, misc declarations | 41 |

`budget.jsx` alone carries 36 dead style keys (~105 lines), 22 of them near-byte-identical copies
of `BudgetSetupSheet.jsx`.

## F5–F30 — Remaining

| ID | Sev | Problem |
|---|---|---|
| F5 | HIGH | `groups/[id].jsx` is **1,812 lines** with 4 modals, a screen, 5 helpers and a 167-key stylesheet — four separate `const [error, setError]` in one file. `direct/[friendId].jsx` 1,574; `groups.jsx` 1,326 |
| F6 | HIGH | **Zero tests in the repo.** No runner, no dependency. The only executable verification is a `require.main` block attached to dead code, with expectations in comments |
| F7 | HIGH | `direct/[friendId].jsx:253-256` — the entire load of a money screen fails into `console.error` with the comment *"UI shows empty state"*. A network failure is indistinguishable from "we're square" |
| F8 | HIGH | `groups.jsx` has **six** bare `catch { /* non-critical */ }` blocks; seven more across `friends.jsx`, `contacts.jsx`, `transactions.jsx`, `profile.jsx`. `friends.jsx:209` renders a failed search as "no users found" |
| F9 | HIGH | `groupController.js:54-56` — a balance-computation failure is reported to the client as **`myBalance: 0`, i.e. "settled up"**. Silently wrong money, no log |
| F10 | HIGH | ~160 hardcoded colour literals against the project's own "never hardcode colour" rule |
| F11 | MED | `AuthContext.jsx:36-38` — a transient network failure during session restore silently logs the user out, identically to an expired token |
| F12 | MED | Two implementations of "total owed/to-receive" (`dashboardController` includes direct splits, `getUserSummary` doesn't) and two of per-friend direct balances, which **diverge** on settlements with no splits |
| F13 | MED | No service layer on the backend — `dashboardController.js` is 242 lines of inline aggregation, which is how the direct-balance algorithm got duplicated into it |
| F14 | MED | No linting on the backend at all — every dead export in F4 would have been caught by `no-unused-vars` |
| F15 | MED | CLAUDE.md drift: `metro.config.js` contains no alias config; 6 of 13 routes undocumented; ~20 endpoints undocumented; 5 undocumented logger tags; `analytics` and `contacts` missing from `_layout.jsx`'s `<Stack.Screen>` list so they don't get the declared `screenOptions` |
| F16 | MED | Four different loading idioms across four screens |
| F17 | MED | `directSplitController.js:455` is the only line in that file tagged `TXN` instead of `DIRECT` — grepping `DIRECT` misses split edits |
| F18 | MED | Frontend re-derives server-computed totals on three screens — two sources of truth for the same number |
| F19 | LOW | `pushNotification.js:30-33` — response `resume()`d without checking status; Expo returns per-token errors in a 200 body, so `DeviceNotRegistered` is invisible and stale tokens are never pruned |
| F20 | LOW | `utils/upiPayment.js:28, 41` — `console.log`s payee UPI IDs and amounts to the device log in production paths |
| F21 | LOW | `morgan` still declared in `package.json`; `reset-project` script points at a directory that doesn't exist |
| F22 | LOW | Root `package-lock.json` with no root `package.json` |
| F23–F30 | LOW | Dead model fields (`isVerified`, `walletBalance`, `avatar` returned but never rendered, `phone` readable but never writable); `Group.type` plumbed to the list but never displayed; dead theme tokens; `tsconfig.json` includes `.ts`/`.tsx` though none exist; duplicate membership check with a different message than the middleware |

---

# Already fixed this session

**P0 (11 items)** — group creation (frontend + backend), contact soft-delete with null guards,
sparkline UTC bucketing + crash guard, duplicate `modalOverlay` style key, InfoModal clipping,
QR-scanner button stretching, AddMemberModal refetch loop, `payerShare` rescale on amount edit,
dashboard direct-split sign/amount, 401 auth-state clearing, invisible skeletons. Plus
`AnimatedBar` NaN clamping.

**R1 — the `_id`/`id` root cause.** `login`/`register` returned `{id}` while `/me` returns `{_id}`,
so `user._id` was undefined for the whole session after a fresh login. This broke `isAdmin` (no
add-member icon) and `normalizeDirectSplit` (1-on-1 splits vanished from Transactions). Fixed in
`authController` plus a `normalizeUser` guard in `AuthContext`. **Found by device testing, not by
any static pass.**

**R4** — Dashboard now refetches on focus. *Note: this is the cause of E15 — the fix was correct,
but it amplifies E1 until the N+1 is batched.*

**R5/R6 — keyboard and sheet sizing** *(needs device confirmation)*. All 12
`KeyboardAvoidingView`s moved to `behavior="padding"` on both platforms, and all 20 Modals given
`statusBarTranslucent` so KAV measures against the right window origin on Android.
> **R9 — `flexGrow: 0` reverted.** Added to the sheet ScrollViews so they would hug their content
> instead of always filling to `maxHeight`. This was a **speculative fix for a problem never
> observed on device**, and it broke the sheets: `flexGrow` and `flexShrink` are independent, and
> ScrollView keeps `flexShrink: 1`. So the sheet could shrink when the keyboard pushed it, but
> could never grow back — a one-way ratchet.
>
> Reported as: *"on opening Add Expense there is no scope of scrolling, but after opening and
> closing the keyboard the window does not return to the initial state and is allowed to be
> scrolled."* Reverted on all three sheets.
>
> `EditSplitSheet` **keeps** the `maxHeight: '85%'` it was missing entirely — that was a genuine
> defect (it split the screen with the backdrop and sat at ~75%), independently flagged by the UI
> audit, and it carries no `flexGrow` hazard.

> **R8 — `navigationBarTranslucent` reverted.** It was added alongside `statusBarTranslucent` in
> the same pass. It made every Modal window extend under the Android navigation bar, and because
> the sheets are `justifyContent: 'flex-end'`, the bottom of each sheet landed behind the gesture
> bar — reported on device as *"the lower half of the Add Expense button gets cut out"*.
>
> `statusBarTranslucent` is kept on all 20 (it fixes the top dim band and is what KAV needs to
> measure correctly). `navigationBarTranslucent` is only safe once **D6** is done — every
> bottom-anchored sheet, FAB and input bar needs real `useSafeAreaInsets()` padding first. Treat
> these as a pair: do D6, then re-add it.

**Also fixed:** the 401 interceptor no longer clears auth on a failed *login* (C6-adjacent).

---

# Corrections to the original 61-item audit

- **#3 retracted** — `addMember` already returns the correct shape. Not a bug.
- **#16 was backwards.** I claimed `behavior={undefined}` meant "no keyboard handling on Android"
  and listed seven screens as broken, then "fixed" five others *to* `undefined`. Device testing
  proved `undefined` is the broken state under edge-to-edge. Now D4.
- **#32 was graded far too low.** Filed as a cosmetic "profile shows Add UPI ID after login"; it
  was actually R1, the root cause of two user-visible failures.
- **#39 overstated.** The password hash never reaches a client on any current path. `select: false`
  is still worth adding, but it's latent, not live. Now A12.
- **#26 severity reconciled.** See B2 — integrity-critical, not security-critical.

---

# Found after this list was written

Device testing on a physical phone, plus the work above, surfaced things no static pass had.

- **`LayoutAnimation` is a no-op under the New Architecture.** Two accordions — Group Debts on a
  direct chat, and the split breakdown inside an expense bubble — called
  `LayoutAnimation.configureNext` and animated nothing at all. It printed a warning on every
  launch that nobody saw because nobody reads a build log. Now Reanimated. *Fixed.*

- **`android_ripple` installs as the view's *background* drawable.** Every control sets its own
  `backgroundColor`, which painted straight over it, so the Material ripple migration rendered no
  feedback whatsoever — and `Pressable`, unlike `TouchableOpacity`, has no fallback. `foreground:
  true` fixes it. Lint, tag balance and call-site counts all passed while the feature was
  invisible; only a device showed it. *Fixed.*

- **The layout breaks well below the maximum font scale.** At the OS setting of 1.3 headings lose
  their descenders, titles truncate mid-word and stat labels vanish — across every tab. This is
  the audit's P1 about fixed control heights, but much wider than that finding implies: the
  density DESIGN.md describes (11–15px type, tight rows) cannot absorb it by growing containers
  alone. **Capped at 1.2** in `components/text.jsx` as a stopgap; ~25 text-bearing styles still
  carry a hardcoded `height`, and the tab bar's 64px is fixed. *Mitigated, not fixed.*

- **There is no remove-member UI.** `DELETE /api/groups/:id/members/:userId` is mounted and live,
  but nothing in the app calls it — the Members tab only lists people. So **B1 was never reachable
  by tapping**, which lowers its practical severity considerably. PRODUCT.md records "admin member
  management" as shipped; half of it is. *Open.*

- **The category donut drew every slice as a half-disc.** `PieHalf` placed a rectangle over the
  right half of the circle and rotated it about the circle's centre by `sweep - 180`. Rotating a
  half-disc turns it but never makes it smaller, so every segment rendered at 180° whatever its
  value — two categories always read as a 50/50 split, and three or more drew overlapping
  semicircles where the last one won. The legend percentages beside it were correct the whole
  time, which is why it looked like a rounding quirk rather than a broken chart. Redrawn with
  `react-native-svg` arcs sized by `strokeDasharray`, so a slice's size is its value. *Fixed.*

- **Expense timestamps were stored as UTC midnight**, so every expense in every group reads back
  as 5:30 am in IST. New expenses carry a real time; existing rows keep the wrong one and would
  need a migration. *Fixed forward only.*
