# PayCircle

A group expense management and personal finance tracking app for college students sharing living expenses. Split bills, track balances, record personal income/expenses, and stay on budget — all in one place.

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

---

## Project Structure

```
PayCircle/
├── backend/          # Express API
│   ├── src/
│   │   ├── index.js              # Entry point, HTTP logger, route registration
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/           # auth (JWT protect), groupAuth (isMember), errorHandler
│   │   ├── models/               # User, Group, Expense, PersonalTransaction, Settlement, Budget
│   │   ├── controllers/          # authController, groupController, expenseController,
│   │   │                         # personalTransactionController, settlementController,
│   │   │                         # balanceController, dashboardController, budgetController
│   │   ├── routes/               # auth.js, groups.js, users.js
│   │   ├── services/balanceService.js  # Core balance + debt-simplification algorithm
│   │   └── utils/                # asyncHandler, logger
│   └── .env.example              # Required environment variables
│
├── frontend/         # Expo app
│   ├── app/
│   │   ├── _layout.jsx           # Root: AuthProvider + RootGuard (auth redirects)
│   │   ├── auth/
│   │   │   ├── login.jsx         # Login with email/password + logo
│   │   │   └── register.jsx      # Registration with validation + logo
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx       # Bottom tab bar (Dashboard, Groups, Transactions, Profile)
│   │   │   ├── index.jsx         # Dashboard — balances, spend stats, budget, recent activity
│   │   │   ├── groups.jsx        # Groups list with live balances + settlements history tab
│   │   │   ├── transactions.jsx  # Personal income/expense tracker
│   │   │   └── profile.jsx       # User profile + functional settings
│   │   ├── budget.jsx            # Full budget page — overall limit + custom category budgets
│   │   └── groups/[id].jsx       # Group detail — expenses, balances, members, settlements
│   ├── assets/images/
│   │   ├── PayCircleLogo.png     # Full logo with text (used on login screen)
│   │   └── PayCircleIcon.png     # Icon-only logo (used on register screen)
│   ├── context/AuthContext.jsx   # Global auth state, session restore on launch
│   ├── services/api.js           # Axios instance with dynamic BASE_URL + JWT interceptor
│   ├── services/auth.js          # AsyncStorage helpers for token/user persistence
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

| Resource | Method | Endpoint |
|---|---|---|
| Auth | `POST` | `/api/auth/register` · `/api/auth/login` |
| Auth | `GET` | `/api/auth/me` |
| Groups | `GET · POST` | `/api/groups` |
| Group | `GET` | `/api/groups/:id` |
| Members | `GET · POST` | `/api/groups/:id/members` |
| Members | `DELETE` | `/api/groups/:id/members/:userId` |
| Group Expenses | `GET · POST` | `/api/groups/:id/expenses` |
| Balances | `GET` | `/api/groups/:id/balances` |
| Settlements | `GET · POST` | `/api/groups/:id/settlements` |
| Personal Balance Summary | `GET` | `/api/users/me/summary` |
| Personal Transactions | `GET · POST` | `/api/users/me/transactions` |
| Personal Transaction | `DELETE` | `/api/users/me/transactions/:id` |
| Dashboard | `GET` | `/api/users/me/dashboard` |
| Budget | `GET · POST` | `/api/users/me/budget` |
| Category Budgets | `POST` | `/api/users/me/budget/categories` |

Group expense and balance endpoints require group membership (`isMember` middleware). The `isMember` middleware loads the full group document into `req.group` — controllers do not re-fetch it.

---

## Key Design Decisions

**Two separate data scopes:**
- *Group expenses* — always tied to a `groupId`, split equally or by exact amounts among members
- *Personal transactions* — tied to a `userId` only, track independent income and personal spending
- Both are aggregated together in the dashboard and budget spend calculations

**Balance algorithm** (`services/balanceService.js`):
Computes `credit[user] - debit[user]` across all group expenses and settlements, then runs a greedy debt-simplification pass to produce a minimal `debts[]` list. This is the single source of truth — all balance-related endpoints call `calculateGroupBalances()`.

**Auth redirect logic** is owned entirely by `RootGuard` in `app/_layout.jsx`. Individual screens never perform redirects.

**Dynamic API base URL** (`services/api.js`):
`BASE_URL` is derived at runtime from `expo-constants` `hostUri` (the Metro bundler host IP), so the app always hits the correct dev machine on LAN without manual configuration.

---

## Features

### Authentication
- Register with name, email, and password (validated: 8+ chars, letters + numbers)
- Login with JWT session that persists across app restarts via AsyncStorage
- Session restored on launch via `GET /api/auth/me` — no re-login needed

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

### Profile
- Displays name, email, join date, groups count, total transactions, and net saved
- **Notifications** — alert with upcoming feature info
- **Privacy & Security** — bottom sheet with data storage, password hashing, and JWT session details
- **Currency (INR)** — alert confirming INR-only with multi-currency roadmap note
- **Appearance** — alert confirming dark mode with light mode roadmap note
- **Help & FAQ** — bottom sheet with 6 common Q&A (groups, splits, settlements, budget, transactions, adding members)
- **About PayCircle** — bottom sheet with version, description, tech stack, and support info
- Sign out with confirmation dialog

---

## Development Status

### ✅ Complete — MVP 1.0

All 12 MVP features are fully implemented and wired end-to-end:

| # | Feature | Status |
|---|---|---|
| 1 | User registration and login | ✅ |
| 2 | Create and join groups | ✅ |
| 3 | Add and manage group members | ✅ |
| 4 | Add expense (amount, payer, category, notes) | ✅ |
| 5 | Equal split | ✅ |
| 6 | Automatic real-time balance calculation | ✅ |
| 7 | You owe / You are owed summary | ✅ |
| 8 | Group balance overview (who owes whom) | ✅ |
| 9 | Record settlements (manual settle-up) | ✅ |
| 10 | Expense history | ✅ |
| 11 | Personal dashboard | ✅ |
| 12 | Monthly budget with usage indicator | ✅ |
| 13 | Custom category budgets (user-defined) | ✅ |

---

### 🔜 Phase 2 — Planned

- Settlement optimization — upgrade greedy algorithm to minimum-cash-flow (graph-based) to further reduce transaction counts
- Additional split types — percentage splits and share-based (weighted) splits
- Edit and delete group expenses
- Recurring expenses with auto-add scheduling
- Push notifications — settlement reminders, budget threshold alerts

### 🔜 Phase 3 — Polish

- Spending charts and analytics (bar, pie, line)
- Behavioural insights ("You spent 42% on food this month")
- Data export — PDF and CSV
- UPI payment links for settlements
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
