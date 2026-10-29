# PayCircle — Product Requirements Document

**Version:** 1.1  
**Date:** April 2026  
**Project Type:** College Minor Project  
**Status:** MVP Complete, Phase 2 Planned

---

## 1. Product Overview

PayCircle is a mobile expense management application for college students sharing living expenses. It covers three distinct financial contexts in a single app:

| Context | Description |
|---|---|
| Group expenses | Bills split among hostel roommates, mess groups, or travel groups |
| Direct (1-on-1) splits | Ad-hoc expenses shared between two friends outside any group |
| Personal finance | Individual income and expense tracking with budget control |

All three contexts feed into a unified dashboard and monthly budget, giving users a single view of their financial position.

---

## 2. Problem Statement

College students sharing accommodation or group activities face a recurring set of friction points:

1. **Tracking who paid what** — verbal agreements are forgotten; spreadsheets are abandoned
2. **Settling up** — knowing the final amount to transfer requires mental arithmetic across multiple expenses
3. **Budget awareness** — students overspend without realising it mid-month because spending is scattered across different contexts
4. **Offline inclusion** — not every flatmate has the same expense-tracking app, creating gaps in records

PayCircle solves all four by providing a single app that records, calculates, and surfaces balances in real time, covers both group and 1-on-1 contexts, and includes personal budgeting.

---

## 3. Target Users

### Primary — Hostel / PG Students
- 18–24 years old, living in shared accommodation
- Share recurring costs: mess fees, electricity, Wi-Fi, groceries
- Need simple equal splits with occasional custom amounts
- Settle up via UPI (GPay, PhonePe, Paytm)

### Secondary — Travel / Outing Groups
- Ad-hoc groups formed for trips, outings, or events
- Expenses are varied: transport, accommodation, food, activities
- Group dissolves after the trip; need clean final settlement

### Tertiary — Cost-conscious students (personal finance)
- Track personal income (internship stipend, freelance, allowance)
- Monitor spending against a monthly budget
- Want category-level visibility without a complex finance app

---

## 4. Goals and Non-Goals

### Goals
- A new user can onboard, create a group, add an expense, and view balances in under 5 minutes
- Balance calculations are always accurate — zero manual reconciliation needed
- Settling up requires a single tap (UPI deep link or QR scan)
- Budget status is visible at a glance on the dashboard
- Works entirely offline-aware for people who don't have PayCircle accounts (virtual contacts)

### Non-Goals
- Multi-currency support (INR only for MVP)
- Receipt OCR or photo attachment
- In-app payment processing (UPI deep links only — PayCircle never handles money)
- Web or desktop client
- Social / feed features
- Real-time push notifications (planned for Phase 2)

---

## 5. User Personas

### Persona A — Rohan (Group Admin)
> Rohan shares a 3-bedroom flat with 4 others. He pays most bills and wants to track who owes him without chasing people. He creates a "Flat 204" group, adds flatmates, and logs every shared expense. At month-end he records settlements as flatmates transfer via UPI.

### Persona B — Priya (Group Member)
> Priya is added to the group by Rohan. She checks her balance before paying and uses the settle-up button to open GPay with the amount pre-filled. She also logs her own salary and personal spends to track her monthly budget.

### Persona C — Arjun (Solo Splitter)
> Arjun often goes out with one friend and splits the bill. He doesn't want to create a group for this — he uses Direct Splits to log the expense under his friend's profile and settle directly.

### Persona D — Meera (Offline Contact)
> Meera doesn't have PayCircle. Arjun adds her as a virtual contact so he can still log expenses against her name and track what she owes him informally.

---

## 6. Feature Requirements

### 6.1 Authentication

| Requirement | Priority |
|---|---|
| Register with name, username, email, password | P0 |
| Username: 3–20 chars, lowercase, numbers, underscore only | P0 |
| Password: 8+ chars, at least one letter and one number | P0 |
| Login with email + password, JWT session | P0 |
| Persist session across app restarts (AsyncStorage) | P0 |
| Restore session on launch via `GET /api/auth/me` | P0 |
| Forgot password / email verification | Out of scope |

### 6.2 Friends

| Requirement | Priority |
|---|---|
| Search users by name or username | P0 |
| Send, accept, reject friend requests | P0 |
| Friends list with per-friend direct balance | P0 |
| Pending request badge on Split tab | P1 |

### 6.3 Virtual Contacts

| Requirement | Priority |
|---|---|
| Create a named virtual contact (no PayCircle account required) | P0 |
| Virtual contacts usable in direct splits exactly like registered friends | P0 |
| Rename or delete a virtual contact | P0 |
| Contacts are private — visible only to their creator | P0 |

### 6.4 Groups

| Requirement | Priority |
|---|---|
| Create group with name and type (Roommates / Trip / Mess / Miscellaneous) | P0 |
| Creator is automatically group admin | P0 |
| Admin: add members by email, remove members | P0 |
| Group list shows per-group net balance for logged-in user | P0 |

### 6.5 Group Expenses

| Requirement | Priority |
|---|---|
| Add expense: amount, payer (any member), category, date, notes | P0 |
| Equal split among all members | P0 |
| Exact amount split (custom per-member amounts, validated to sum to total) | P0 |
| Expense list: total, payer, user's share (lent / owe) | P0 |
| Edit / delete expense | P2 |
| Percentage and share-based splits | P2 |

### 6.6 Group Balances & Settlements

| Requirement | Priority |
|---|---|
| Real-time balance calculation on every expense/settlement change | P0 |
| Per-group balance card: paid, share, net position | P0 |
| Greedy debt-simplification to produce minimal debts list | P0 |
| Member balance table: total paid, total owed, net for every member | P0 |
| Record settlement modal: payer, receiver, amount, notes | P0 |
| Settlement history list | P0 |

### 6.7 Direct Splits (1-on-1)

| Requirement | Priority |
|---|---|
| Add expense with a friend (equal or custom split) | P0 |
| Per-friend balance summary (you owe / they owe) | P0 |
| Edit a direct split entry | P0 |
| Settle-up flow: request → confirm/reject → balance clears | P0 |
| Cancel a pending settlement request | P0 |
| Combined group + direct balance with a specific friend | P0 |
| UPI deep link on settle: opens installed UPI app with amount pre-filled | P0 |

### 6.8 Personal Transactions

| Requirement | Priority |
|---|---|
| Log income: Salary, Freelance, Investment, Miscellaneous | P0 |
| Log expense: Food, Travel, Utilities, Entertainment, Health, Shopping, Miscellaneous | P0 |
| Filter by All / Income / Expense | P0 |
| Transactions grouped by month | P0 |
| Long-press to delete | P0 |
| Summary card: total income, total expense, net | P0 |

### 6.9 Dashboard

| Requirement | Priority |
|---|---|
| Group net balance (owed to you vs. you owe across all groups) | P0 |
| Spent this month (group shares + personal expenses) | P0 |
| Earned this month (personal income) | P0 |
| Monthly budget progress bar + ring (healthy / warning / critical / over) | P0 |
| Recent activity: last 5 personal transactions | P0 |
| Pull-to-refresh | P0 |

### 6.10 Monthly Budget

| Requirement | Priority |
|---|---|
| Set / edit overall monthly spending limit | P0 |
| Progress bar + ring with threshold colours (< 70% / 70–90% / 90–100% / > 100%) | P0 |
| Custom category budgets with user-defined names and limits | P1 |
| Per-category progress bars: spent, remaining, overflow | P1 |
| Category icons auto-assigned by keyword matching | P1 |
| Edit / delete category budget from bottom-sheet modal | P1 |
| Spend = group shares + personal expenses + direct split shares (current month) | P0 |
| Pull-to-refresh | P0 |

### 6.11 Split Tags

| Requirement | Priority |
|---|---|
| Tag any direct split or group expense with a custom category string | P1 |
| One tag per user per expense (upsert on re-tag) | P1 |
| Tags feed into budget category spend calculations | P1 |

### 6.12 Analytics

| Requirement | Priority |
|---|---|
| Category breakdown bar chart for selected month | P1 |
| Month-by-month total spend trend (last 6 months) | P1 |
| Day-of-week average spend heatmap | P1 |
| Covers group + personal + direct spend combined | P1 |
| Month selector for historical browsing; pull-to-refresh | P1 |

### 6.13 QR Scanner

| Requirement | Priority |
|---|---|
| Scan UPI QR codes using device camera (`expo-camera`) | P1 |
| Parse `upi://pay?...` — extract payee name, UPI ID, amount | P1 |
| Hand off to installed UPI app to complete payment | P1 |
| Camera permission request with graceful fallback UI | P1 |

### 6.14 Profile

| Requirement | Priority |
|---|---|
| Display name, username, email, join date, groups count, total transactions, net saved | P0 |
| Privacy & Security info sheet | P1 |
| Help & FAQ sheet | P1 |
| About PayCircle sheet | P1 |
| Sign out with confirmation dialog | P0 |

---

## 7. Data Models

### Users
```
_id, name, username, email, password (bcrypt), isVirtual, createdBy, pushToken, createdAt
```

### Groups
```
_id, name, type (Roommates|Trip|Mess|Miscellaneous), adminId, members[], createdAt
```

### Expenses
```
_id, groupId (required), amount, payerId, date, category, notes, splitType (equal|exact), splits[{userId, amount}]
```

### PersonalTransactions
```
_id, userId (required), type (income|expense), amount, category, date, notes
```

### Settlements (Group)
```
_id, groupId, fromUserId, toUserId, amount, date, notes
```

### DirectSplit
```
_id, payerId, otherUserId, amount, description, payerShare, date
```

### DirectSettle
```
_id, requesterId, receiverId, amount, status (pending|confirmed|rejected|cancelled), notes, date
```

### Friendships
```
_id, requesterId, receiverId, status (pending|accepted|rejected)
```

### Budget
```
_id, userId, month (YYYY-MM), amount, categories[{name, limit}]
```

### SplitTag
```
_id, userId, refId, refType (direct|group), category
Unique index: (userId, refId, refType)
```

---

## 8. API Surface (Summary)

| Domain | Endpoints |
|---|---|
| Auth | POST /register · /login, GET /me |
| Groups | CRUD on groups, members, expenses, balances, settlements |
| Personal finance | Dashboard, spending-history, transactions, budget + categories |
| Friends | Search, send/accept/reject requests, friends list |
| Contacts | CRUD on virtual contacts |
| Direct splits | Add, edit, list splits; request/confirm/cancel settlements; per-friend balances |
| Split tags | Upsert + list tags |

All authenticated endpoints require `Authorization: Bearer <token>`. Group-scoped endpoints run through `isMember` middleware which loads `req.group` before the controller.

---

## 9. Technical Architecture

### Backend
- **Runtime:** Node.js 18+ with Express 5
- **Database:** MongoDB Atlas via Mongoose 9
- **Auth:** JWT (7-day expiry) + bcryptjs (10 salt rounds)
- **Error handling:** Global `asyncHandler` wrapper — controllers throw, never try/catch
- **Logging:** Custom structured logger (`utils/logger.js`) with tagged levels; HTTP middleware logs every request/response with timing
- **Balance engine:** `services/balanceService.js` — single source of truth for all group balance data; greedy debt-simplification on every call

### Frontend
- **Framework:** React Native 0.81.5 + Expo SDK 54
- **Navigation:** expo-router 6 (file-based, tab + stack)
- **Auth state:** `AuthContext` + `RootGuard` own all session and redirect logic; screens are stateless regarding auth
- **API layer:** Axios instance with dynamic `BASE_URL` from `expo-constants` `hostUri` — no manual IP config
- **Theme:** All colours from `constants/theme.js` (`PC` tokens) — no hardcoded colour values anywhere
- **File types:** All source files are `.jsx`/`.js` — no TypeScript source files

---

## 10. Constraints and Assumptions

| Constraint | Detail |
|---|---|
| Currency | INR (₹) only — hardcoded, no i18n layer |
| Platform | iOS and Android via Expo Go (dev); no web target |
| Payments | UPI deep links only — PayCircle never handles or stores payment data |
| Connectivity | Requires network for all operations; no offline queue |
| Groups | Members must have a PayCircle account (virtual contacts cover the offline case for direct splits only) |
| Splits | Group expenses support equal and exact splits only (percentage/shares are Phase 2) |

---

## 11. Roadmap

### ✅ MVP 1.0 — Complete
All core features shipped: auth, friends, virtual contacts, groups, group expenses (equal + exact split), balances, settlements, direct splits, personal transactions, dashboard, monthly budget, custom category budgets, split tags, analytics, UPI deep link, QR scanner.

### Phase 2 — Planned
| Feature | Rationale |
|---|---|
| Settlement optimization (min-cash-flow graph algorithm) | Reduces the number of transfers needed to settle a group |
| Percentage and share-based splits | Handles unequal contributors (e.g. larger room = larger rent share) |
| Edit and delete group expenses | Correcting data entry errors is a basic expectation |
| Recurring expenses | Automates fixed monthly costs (rent, mess fee, Wi-Fi) |
| Push notifications | Settlement reminders and budget threshold alerts |

### Phase 3 — Polish
| Feature | Rationale |
|---|---|
| Behavioural spending insights | Rule-based callouts ("You spent 42% on food this month") |
| Data export (PDF / CSV) | Useful for reimbursement or personal records |
| UI animations and micro-interactions | Polish for submission and demonstration |

### Future (Post-Submission)
- Multi-currency support
- Receipt OCR / photo attachment
- ML-based expense prediction and auto-categorisation
- Integration with bank SMS parsers for automatic expense detection

---

## 12. Success Criteria

| Criterion | Target |
|---|---|
| Full user journey (register → group → expense → balance) | Completable in < 5 minutes |
| Balance calculation accuracy | 100% — verified manually against known scenarios |
| API response time (p95) | < 2 seconds on LAN |
| App cold-start time | < 3 seconds on a mid-range Android device |
| Cross-platform | Works on both iOS and Android via Expo Go |
| Zero critical bugs | No crashes or data loss in normal usage paths |

---

*End of PayCircle PRD — v1.1*
