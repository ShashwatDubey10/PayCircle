# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

**Primary — hostel / PG students (18–24).** Living in shared accommodation, splitting
recurring costs: mess fees, electricity, Wi-Fi, groceries. Mostly equal splits with the
occasional custom amount. They settle with each other through UPI apps (GPay, PhonePe,
Paytm) that are already on the phone.

**Secondary — travel and outing groups.** Ad-hoc groups formed for a trip or an event, with
varied expenses (transport, stay, food, activities). The group dissolves afterwards, so what
matters is a clean final settlement.

**Tertiary — cost-conscious students tracking personal money.** Internship stipend,
freelance income, allowance on one side; category-level spending against a monthly limit on
the other. They want visibility without a full personal-finance app.

**Non-account participants.** People who don't have PayCircle exist in the ledger as
*virtual contacts* — created by one user, private to that user, usable in direct splits
exactly like a registered friend.

**Roles.** The group creator is its admin (adds and removes members); everyone else is a
member. There is no other privilege tier.

**Who it is actually for, confirmed this session:** real users installing from Google Play,
not only project examiners. The app originated as a college minor project, but the academic
submission is its origin, not the ceiling on its audience. Design work is held to the
standard of a stranger using it unsupervised on their own phone.

## Product Purpose

PayCircle records, calculates and surfaces who owes what across three financial contexts —
group expenses, 1-on-1 direct splits, and personal income/expense — in a single app, so
students never do mental arithmetic across a month of shared bills and never have to chase
people from memory.

It exists because the alternatives fail in a specific way: verbal agreements are forgotten,
shared spreadsheets get abandoned, and spending scattered across group life and personal
life means students overshoot their month without noticing.

Success looks like:

- A new user can register, create a group, add an expense and read their balances in under
  five minutes.
- Balance figures never need manual reconciliation — the number shown is the number owed.
- Settling up is one tap into a UPI app with the amount already filled in.
- Budget position is legible at a glance, without opening a second screen.
- Someone without PayCircle can still be tracked accurately.

## Positioning

Three contexts, one ledger. Group splits, 1-on-1 splits that need no group, and personal
income and expense all roll up into a single dashboard and a single monthly budget, where
"spent" is the sum of group shares, direct-split shares and personal expenses for the
current month.

That union is the claim a neighbouring product cannot truthfully copy: a bill-splitting app
has no personal budget, and a personal-finance app has no shared ledger. Virtual contacts
extend the same ledger to people who never install the app.

## Operating Context

- **Device and posture.** Personal Android phone, portrait only, edge-to-edge. Used in two
  distinct rituals: logging in the moment (standing at a shop, splitting a restaurant bill)
  and reconciling at month-end.
- **Navigation.** Four tabs — Dashboard, **Split**, Transactions, Profile. The second tab is
  labelled "Split" in the UI although its route file is `(tabs)/groups.jsx`; it covers
  groups, settlements and the entry point to friends and direct splits. Beyond the tabs:
  `groups/[id]`, `direct/`, `friends`, `contacts`, `budget`, `analytics`, `qr-scanner`, and
  `auth/login` + `auth/register`.
- **Money never moves through PayCircle.** Settling means opening a `upi://pay?...` deep
  link in an installed UPI app, or scanning a UPI QR with the camera, and then recording the
  settlement in PayCircle. The app is a ledger, never a payment processor.
- **Backend hosting shapes the first launch.** The API runs on Render's free tier, whose
  idle containers cold-start in 30–60 seconds. `services/api.js` fails fast at 10s, then
  retries once with a 60s timeout, while `RootGuard` / `ServerWakingOverlay` shows an
  explicit "waking up the server" state. The first launch of the day is genuinely slow; the
  design states that rather than disguising it as a generic failure.
- **Always online.** Every operation requires network. There is no offline queue or local
  write-behind cache.

## Capabilities and Constraints

**Shipped (MVP 1.0, complete).** Auth with username rules and persisted JWT session;
friends (search, request, accept, reject) with per-friend balance; virtual contacts; groups
with type (Roommates / Trip / Mess / Miscellaneous) and admin member management; group
expenses with equal and exact splits; real-time group balances with greedy debt
simplification; group settlements with history; direct 1-on-1 splits with a
request → confirm/reject settle flow; personal income and expense transactions with filters
and month grouping; unified dashboard; monthly budget with threshold states and custom
category budgets; split tags feeding budget categories; analytics (category breakdown,
six-month trend, day-of-week averages); UPI deep link; UPI QR scanner; profile with
in-app account deletion.

**Hard constraints.**

- Currency is INR (₹), hardcoded. There is no i18n or localisation layer.
- No web or desktop client. `react-native-web` is present but is not a target.
- Group expenses support equal and exact splits only. Percentage and share-based splits are
  not built.
- Group members must have a PayCircle account. Virtual contacts work in direct splits only.
- Group expenses cannot be edited or deleted yet; a wrong entry is corrected by offsetting.
- JWT sessions expire after 7 days. There is no forgot-password or email-verification flow.
- No receipt photos, no OCR, no attachments of any kind.
- No push notifications in the shipped build (`expo-notifications` is installed and
  `IS_EXPO_GO` guards it, but reminders and alerts are not implemented).
- Account deletion **tombstones** rather than erases. Private data (personal transactions,
  budgets, private categories, friendships, personal contacts and their splits) is deleted;
  shared ledger rows survive with the identity stripped and the name rendered as "Deleted
  user", because `balanceService` sums over `Group.members` and removing an id would silently
  rewrite what every other member owes. Admin role passes to a remaining member; solo groups
  are removed with their ledger.

**Terminology, as the product says it.** "Split" (the tab, and the act), "direct split" for
1-on-1, "virtual contact", "settle up", "split tag", "net position", and lent / owe for the
two directions of a balance.

**Explicitly undecided — do not resolve these by assumption.**

- Phase 2 (settlement optimisation via min-cash-flow, percentage and share splits, expense
  edit/delete, recurring expenses, push notifications) is *planned*, not committed, and
  nothing in the current design should promise it.
- Whether a light theme ever exists.
- Whether the incumbent palette and typeface stay (see Brand Commitments).
- Monetisation. The app is free and no pricing, tier or paid feature has been decided.

## Brand Commitments

**Binding.** The name *PayCircle*, and the existing logo and icon assets in
`frontend/assets/images/` — `PayCircleLogo.png`, `PayCircleLogo(without text).png`,
`PayCircleIcon.png`, `icon.png`, the Android adaptive icon set (foreground / background /
monochrome), and `splash-icon.png`. Future work preserves these rather than redrawing them.

**Confirmed *not* binding this session.** The "Mint Terminal" palette in
`frontend/constants/theme.js` (near-black `#060A09` ground, electric mint `#00E5BE` accent),
the dark-only decision (`userInterfaceStyle: "dark"` in `app.json`), and the Roboto
typeface. These are the incumbent implementation and are evidence of what exists — not
commitments. They may be reconsidered.

No voice or tone guide has been established. Future work must not invent one and present it
as a brand fact.

## Evidence on Hand

**Real and usable.**

- A complete working app and API — every MVP feature above is implemented, not mocked.
- Product documentation: `docs/PRD.md` (v1.1), `docs/PayCircle_MVP_Specification.md`,
  `docs/PayCircle_Feature_Blueprint.md`, `docs/Development_Plan.md`,
  `docs/PayCircle_Frontend_Integration_Plan.md`, `docs/PayCircle_Dev_Setup.md`,
  `docs/PayCircle_Audit.md`, `docs/PayCircle_Bug_List.md`,
  `docs/PayCircle_PlayStore_Release.md`.
- Diagrams and models: `docs/erd_diagram.md`, `docs/paycircle_erd_diagram.pdf`,
  `docs/dfd_level2_1..6.jpeg`, `docs/paycircle_usecase1.jpg`, `docs/paycircle_usecase3.jpg`,
  `docs/paycircle_flow1/2.{jpg,png}`, `docs/Impact Mapping.jpg`.
- Legal pages drafted against what the code actually does: `docs/privacy-policy.html` and
  `docs/account-deletion.html`. Both still contain `[PLACEHOLDER]` fields and neither is
  published at a public URL yet.
- `frontend/assets/images/ui.png`.

**Absences that future work must not fabricate.**

- No real users and no recruited testers. Play's closed-test requirement (12 testers opted
  in continuously for 14 days) has not been started.
- No usage data, retention figures, or analytics of real behaviour.
- No testimonials, reviews, ratings, press, or case studies.
- No published Play listing, and no store screenshots of record.
- No performance benchmarks beyond the manually-verified targets in PRD §12.
- No pricing, revenue, or customer counts of any kind.

## Product Principles

1. **The number is never in doubt.** `services/balanceService.js` is the single source of
   truth for every balance figure. The UI displays what it returns and never recomputes
   money locally or shows a figure it cannot trace to the ledger.
2. **One ledger, three contexts.** Group, direct and personal always roll up together. Never
   present a total that silently excludes one of them, and label any figure that is
   deliberately scoped to one.
3. **PayCircle records; UPI pays.** Nothing in the product may imply the app moved, held, or
   guaranteed money. Settlement is a record of something that happened elsewhere.
4. **Nobody is excluded for not having the app.** Virtual contacts are first-class in direct
   splits, not a degraded fallback.
5. **Honest waiting beats a hidden failure.** Cold starts, empty states and errors are stated
   plainly in the user's terms. A 40-second server wake is explained, not disguised as
   "Something went wrong".

## Accessibility & Inclusion

**Required standard, confirmed this session: WCAG AA equivalents on Android.** That means
4.5:1 contrast for text, a 48dp minimum touch target, every interactive control carrying an
accessible label and role, and each screen navigable end-to-end with TalkBack.

**Current state, for honesty about the gap:**

- There are **no** `accessibilityLabel`, `accessibilityRole`, or `accessible` props anywhere
  in `frontend/app/` or `frontend/components/`. Screen-reader support is absent, not partial.
- `PC.textMuted` (`#4A6058`) is roughly 3.2:1 against `PC.bg` and fails AA. Its own comment
  in `theme.js` acknowledges this. `PC.textSecondary` (`#637870`) needs checking too.
- Behaviour under OS font scaling and large-text settings has not been tested.
