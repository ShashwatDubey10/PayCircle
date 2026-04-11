# PayCircle

A group expense management and personal finance tracking app for college students sharing living expenses. Split bills, track balances, record personal income/expenses, manage direct 1-on-1 splits with friends, and stay on budget — all in one place.

> **Type:** Minor Project — React Native + Node.js
> **Target:** Hostel students, co-living groups, and travel groups
> **Currency:** INR (₹)
> **Version:** 1.0.0 MVP

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.81.5 + Expo SDK 54 |
| Navigation | expo-router 6 (file-based) |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas (Mongoose 9) |
| Auth | JWT + bcryptjs |
| HTTP Client | Axios |
| Local Storage | AsyncStorage |
| UPI Payments | expo-linking (deep link to UPI apps) |

---

## Project Structure

```
PayCircle/
├── backend/          # Express API
│   ├── src/
│   │   ├── index.js              # Entry point, HTTP logger, route registration
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/           # auth (JWT protect), groupAuth (isMember), errorHandler
│   │   ├── models/
│   │   │   ├── User.js           # isVirtual flag for offline contacts
│   │   │   ├── Group.js
│   │   │   ├── Expense.js
│   │   │   ├── PersonalTransaction.js
│   │   │   ├── Settlement.js
│   │   │   ├── Budget.js
│   │   │   ├── Friendship.js     # Friend requests + friendship state
│   │   │   ├── DirectSplit.js    # 1-on-1 expense splits between friends
│   │   │   ├── DirectSettle.js   # Direct settlement requests between friends
│   │   │   └── SplitTag.js       # Custom category tags on individual expenses
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── groupController.js
│   │   │   ├── expenseController.js
│   │   │   ├── settlementController.js
│   │   │   ├── balanceController.js
│   │   │   ├── dashboardController.js    # dashboard + spending-history
│   │   │   ├── budgetController.js
│   │   │   ├── personalTransactionController.js
│   │   │   ├── friendController.js       # Friend search, requests, UPI ID
│   │   │   ├── directSplitController.js  # Direct splits + settle flow
│   │   │   ├── contactController.js      # Virtual contacts (offline users)
│   │   │   └── splitTagController.js     # Custom expense category tags
│   │   ├── routes/
│   │   │   ├── auth.js           # POST /register /login, GET /me
│   │   │   ├── groups.js         # Groups, members, expenses, balances, settlements
│   │   │   └── users.js          # Dashboard, budget, transactions, friends, direct, contacts, split-tags
│   │   ├── services/balanceService.js  # Core balance + debt-simplification algorithm
│   │   └── utils/                # asyncHandler, logger
│   └── .env.example              # Required environment variables
│
├── frontend/         # Expo app
│   ├── app/
│   │   ├── _layout.jsx           # Root: AuthProvider + RootGuard (auth redirects)
│   │   ├── auth/
│   │   │   ├── login.jsx         # Login screen — full wordmark logo, corner accent design
│   │   │   └── register.jsx      # Registration screen — full wordmark logo, centered layout
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx       # Bottom tab bar (Dashboard, Split, Transactions, Profile)
│   │   │   ├── index.jsx         # Dashboard — balances, spend stats, budget, recent activity
│   │   │   ├── groups.jsx        # Split tab — Friends / Groups / Settlements sub-tabs
│   │   │   ├── transactions.jsx  # Personal income/expense tracker
│   │   │   └── profile.jsx       # User profile + functional settings
│   │   ├── analytics.jsx         # Spending analytics — category breakdown, monthly trends, day-of-week heatmap
│   │   ├── budget.jsx            # Full budget page — overall limit + custom category budgets
│   │   ├── contacts.jsx          # Virtual contacts — add offline users to splits without a PayCircle account
│   │   ├── friends.jsx           # Friends management — search, add, accept/reject requests
│   │   ├── qr-scanner.jsx        # UPI QR code scanner — scan and pay via installed UPI apps
│   │   ├── groups/[id].jsx       # Group detail — expenses, balances, members, settlements
│   │   └── direct/[friendId].jsx # Direct split detail — 1-on-1 expenses + settle flow
│   ├── assets/images/
│   │   └── PayCircleLogo.png-removebg-preview.png  # Full wordmark logo (used on all auth screens)
│   ├── context/
│   │   ├── AuthContext.jsx       # Global auth state, session restore on launch
│   │   └── BadgeContext.jsx      # Pending settlement badge count for Split tab
│   ├── services/
│   │   ├── api.js                # Axios instance with dynamic BASE_URL + JWT interceptor
│   │   ├── auth.js               # AsyncStorage helpers for token/user persistence
│   │   ├── contacts.js           # Virtual contacts CRUD API calls
│   │   ├── friends.js            # Friend search, requests, friend list API calls
│   │   ├── directSplit.js        # Direct split + settle API calls
│   │   └── splitTag.js           # Split tag upsert + fetch API calls
│   ├── utils/
│   │   └── upiPayment.js         # UPI deep link builder (opens installed UPI apps)
│   └── constants/theme.js        # PC design tokens (all UI colors)
│
└── docs/                         # Feature blueprint, MVP spec, integration plan
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- Expo Go app on your phone (iOS or Android)
- Phone and dev machine on the same WiFi network

### Backend

```bash
cd backend
cp .env.example .env          # fill in MONGO_URI and set a strong JWT_SECRET
npm install
npm run dev                   # starts on port 5000 with nodemon auto-reload
```

### Frontend

```bash
cd frontend
npm install
npx expo start                # scan the QR code with Expo Go
```

The app auto-detects your machine's LAN IP from Expo's Metro host — no manual IP configuration needed.

---

## API Reference

All endpoints under `/api/auth/` are public. Everything else requires `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint |
|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` |
| `GET` | `/api/auth/me` |

### Groups & Expenses
| Method | Endpoint |
|---|---|
| `GET · POST` | `/api/groups` |
| `GET` | `/api/groups/:id` |
| `GET · POST` | `/api/groups/:id/members` |
| `DELETE` | `/api/groups/:id/members/:userId` |
| `GET · POST` | `/api/groups/:id/expenses` |
| `GET` | `/api/groups/:id/balances` |
| `GET · POST` | `/api/groups/:id/settlements` |

### Personal Finance
| Method | Endpoint |
|---|---|
| `GET` | `/api/users/me/summary` |
| `GET` | `/api/users/me/dashboard` |
| `GET` | `/api/users/me/spending-history` |
| `GET · POST` | `/api/users/me/transactions` |
| `DELETE` | `/api/users/me/transactions/:id` |
| `GET · POST` | `/api/users/me/budget` |
| `POST` | `/api/users/me/budget/categories` |

### Friends
| Method | Endpoint |
|---|---|
| `GET` | `/api/users/search?q=...` |
| `PUT` | `/api/users/me/username` |
| `PUT` | `/api/users/me/push-token` |
| `POST` | `/api/users/me/friends/requests` |
| `GET` | `/api/users/me/friends/requests` |
| `PUT` | `/api/users/me/friends/requests/:id` |
| `GET` | `/api/users/me/friends` |

### Contacts (Virtual / Offline Users)
| Method | Endpoint |
|---|---|
| `GET · POST` | `/api/users/me/contacts` |
| `PATCH · DELETE` | `/api/users/me/contacts/:id` |

### Direct Splits (1-on-1)
| Method | Endpoint |
|---|---|
| `GET` | `/api/users/me/direct` |
| `GET` | `/api/users/me/direct/settlements` |
| `GET` | `/api/users/me/direct/balances` |
| `GET` | `/api/users/me/direct/:friendId/group-balances` |
| `POST · GET` | `/api/users/me/direct/:friendId` |
| `PATCH` | `/api/users/me/direct/:friendId/splits/:splitId` |
| `POST` | `/api/users/me/direct/:friendId/settle` |
| `PUT` | `/api/users/me/direct/:friendId/settle/:requestId/confirm` |
| `DELETE` | `/api/users/me/direct/:friendId/settle/:requestId` |

### Split Tags
| Method | Endpoint |
|---|---|
| `GET · POST` | `/api/users/me/split-tags` |

Group expense and balance endpoints require group membership (`isMember` middleware). The `isMember` middleware loads the full group document into `req.group` — controllers do not re-fetch it.

---

## Key Design Decisions

**Two separate data scopes:**
- *Group expenses* — always tied to a `groupId`, split equally or by exact amounts among members
- *Personal transactions* — tied to a `userId` only, track independent income and personal spending
- *Direct splits* — tied to a pair of friend `userId`s, for 1-on-1 expense sharing outside groups
- All scopes are aggregated together in the dashboard and budget spend calculations

**Balance algorithm** (`services/balanceService.js`):
Computes `credit[user] - debit[user]` across all group expenses and settlements, then runs a greedy debt-simplification pass to produce a minimal `debts[]` list. This is the single source of truth — all balance-related endpoints call `calculateGroupBalances()`.

**Auth redirect logic** is owned entirely by `RootGuard` in `app/_layout.jsx`. Individual screens never perform redirects.

**Dynamic API base URL** (`services/api.js`):
`BASE_URL` is derived at runtime from `expo-constants` `hostUri` (the Metro bundler host IP), so the app always hits the correct dev machine on LAN without manual configuration.

**UPI deep link** (`utils/upiPayment.js`):
Builds a `upi://pay?...` URL and opens it via `expo-linking`. Works with any installed UPI app (GPay, PhonePe, Paytm, etc.). Falls back to an alert if no UPI app is detected.

**Virtual contacts** (`models/User.js` — `isVirtual: true`):
Offline users are stored as real `User` documents with a placeholder email and an unusable random password, scoped to their creator via `createdBy`. They participate in direct splits exactly like registered users — no special-casing in the balance or settlement logic.

**Split tags** (`models/SplitTag.js`):
A tag maps any `DirectSplit` or group `Expense` document to a user-defined category string. Stored as a separate collection with a unique compound index on `(userId, refId, refType)` so tags are per-user and upserted, not duplicated.

---

## Features

### Authentication
- Register with name, username, email, and password
  - Username: 3–20 chars, lowercase letters, numbers, underscore only
  - Password: 8+ characters with at least one letter and one number
  - Confirm password field with inline mismatch feedback
- Login with email + password; JWT session persists across app restarts via AsyncStorage
- Session restored on launch via `GET /api/auth/me` — no re-login needed

### Friends
- Search users by name or username
- Send, accept, and reject friend requests
- Friends list shows your accepted connections
- Pending request badge on the Split tab

### Direct Splits (1-on-1)
- Add expenses directly with a friend outside any group
- Equal split auto-calculated; or enter custom amounts
- Per-friend balance summary (you owe / they owe)
- **Settle up flow:** request a settlement → friend confirms or rejects → balance clears
- Cancel a pending settlement request before it's confirmed
- View combined group + direct balances with any friend
- UPI payment deep link on settle — opens the user's installed UPI app with amount pre-filled

### Groups
- Create groups with a name and type (Roommates, Trip, Mess, Miscellaneous)
- Add members by email (must have a PayCircle account)
- Admin-only: remove members
- Group list shows each group's current net balance for the logged-in user

### Group Expenses
- Add expenses with amount, category, payer (any member), and optional notes
- Equal split: auto-divides among all members
- Expense list shows each entry's total, payer, and your personal share (lent / owe)

### Balances & Settlements
- Per-group balance card: what you paid, your share, and your net position
- Simplified debts list: greedy algorithm minimises "who owes whom" relationships
- Member balance table: total paid, total owed, net for every member
- **Record Settlement** modal in the Balances tab: pick payer + receiver from member avatars, enter amount and optional notes — updates balances immediately

### Split Tab (bottom nav)
Three sub-tabs in one screen:
- **Friends** — friends list with per-friend direct balance; tap to open direct split detail
- **Groups** — group list with per-group net balance; tap to open group detail
- **Settlements** — unified settlement history (group + direct), pending settlement requests

### Personal Transactions
- Log personal income (Salary, Freelance, Investment, Miscellaneous) and expenses (Food, Travel, Utilities, Entertainment, Health, Shopping, Miscellaneous)
- Filter by All / Income / Expense
- Transactions grouped by month
- Long-press any transaction to delete it
- Summary card shows total income, total expense, and net across all time

### Dashboard
- Group net balance (owed to you vs. you owe, across all groups)
- Spent this month (group shares + personal expenses combined)
- Earned this month (personal income)
- Monthly budget progress bar + ring indicator (healthy / warning / critical / over)
- Recent activity: last 5 personal transactions
- Pull-to-refresh

### Monthly Budget
- Dedicated budget page accessible from the dashboard budget card
- Set or edit an overall monthly spending limit
- Progress bar and circular ring show real-time usage (healthy / warning / critical / over)
- Status thresholds: healthy (< 70%) → warning (70–90%) → critical (90–100%) → over budget (> 100%)
- **Custom category budgets** — add any number of user-defined categories (e.g. "Rent", "Netflix", "Mess") each with their own spending limit
- Category icons assigned automatically based on keywords in the name
- Per-category progress bars showing spent vs. limit, remaining amount, and overflow
- Edit a category's name or limit, or delete it, from a bottom-sheet modal
- Spend figures combine group expense shares and personal expenses for the current month
- Pull-to-refresh on the budget page

### Contacts (Virtual / Offline Users)
- Add people who don't have a PayCircle account as virtual contacts
- Virtual contacts can be added to direct splits just like registered friends
- Rename or delete a virtual contact from the Contacts screen
- Contacts are private — visible only to the user who created them

### Split Tags
- Tag any direct split or group expense with a custom category label
- Tags are per-user and per-expense — one tag per user per expense
- Tags flow into budget category tracking so tagged expenses count against matching category budgets
- Upsert semantics: re-tagging an expense updates the existing tag rather than creating a duplicate

### Analytics
- Full-screen analytics page accessible from the dashboard
- **Category breakdown** — colour-coded bar chart of spending by category for the selected month
- **Monthly trend** — month-by-month total spend over the last 6 months
- **Day-of-week heatmap** — average spend per day of the week to identify peak spending days
- Covers group expense shares, personal expenses, and direct splits combined
- Month selector to browse historical data; pull-to-refresh

### QR Scanner
- Built-in UPI QR code scanner using the device camera (`expo-camera`)
- Parses `upi://pay?...` deep links scanned from any UPI QR code
- Pre-fills payee name, UPI ID, and amount; hands off to the installed UPI app to complete payment
- Camera permission request handled gracefully with a fallback UI

### Profile
- Displays name, username, email, join date, groups count, total transactions, and net saved
- **Notifications** — alert with upcoming feature info
- **Privacy & Security** — bottom sheet with data storage, password hashing, and JWT session details
- **Currency (INR)** — alert confirming INR-only with multi-currency roadmap note
- **Appearance** — alert confirming dark mode with light mode roadmap note
- **Help & FAQ** — bottom sheet with common Q&A (groups, splits, settlements, budget, transactions, adding members)
- **About PayCircle** — bottom sheet with version, description, tech stack, and support info
- Sign out with confirmation dialog

---

## Development Status

### ✅ Complete — MVP 1.0

| # | Feature | Status |
|---|---|---|
| 1 | User registration and login (with username) | ✅ |
| 2 | Friends — search, add, accept/reject requests | ✅ |
| 3 | Direct splits — 1-on-1 expense sharing with friends | ✅ |
| 4 | Direct settlements — request, confirm, cancel settle-up | ✅ |
| 5 | Create and join groups | ✅ |
| 6 | Add and manage group members | ✅ |
| 7 | Add expense (amount, payer, category, notes) | ✅ |
| 8 | Equal split | ✅ |
| 9 | Automatic real-time balance calculation | ✅ |
| 10 | You owe / You are owed summary | ✅ |
| 11 | Group balance overview (who owes whom) | ✅ |
| 12 | Record group settlements (manual settle-up) | ✅ |
| 13 | Expense history | ✅ |
| 14 | Personal dashboard | ✅ |
| 15 | Monthly budget with usage indicator | ✅ |
| 16 | Custom category budgets (user-defined) | ✅ |
| 17 | UPI payment deep link on settle-up | ✅ |
| 18 | Virtual contacts (offline users in splits) | ✅ |
| 19 | Split tags (custom category labels on expenses) | ✅ |
| 20 | Spending analytics (category, monthly trend, day-of-week) | ✅ |
| 21 | UPI QR code scanner | ✅ |

---

### 🔜 Phase 2 — Planned

- Settlement optimization — upgrade greedy algorithm to minimum-cash-flow (graph-based) to further reduce transaction counts
- Additional split types — percentage splits and share-based (weighted) splits
- Edit and delete group expenses
- Recurring expenses with auto-add scheduling
- Push notifications — settlement reminders, budget threshold alerts

### 🔜 Phase 3 — Polish

- Behavioural spending insights ("You spent 42% on food this month")
- Data export — PDF and CSV
- UI animations and micro-interactions

---

## Environment Variables

See `backend/.env.example` for all required keys:

```
MONGO_URI       MongoDB Atlas connection string (mongodb+srv://...)
PORT            API port (default 5000)
JWT_SECRET      Strong random secret — minimum 32 bytes
JWT_EXPIRES_IN  Token lifespan (default 7d)
NODE_ENV        development | production
CLIENT_URL      Allowed CORS origin (use * for development)
```
