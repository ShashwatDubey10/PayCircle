# PayCircle

A group expense management and personal finance tracking app for college students sharing living expenses. Split bills, track balances, record personal income/expenses, and stay on budget — all in one place.

> **Type:** Minor Project — React Native + Node.js
> **Target:** Hostel students, co-living groups, and travel groups
> **Currency:** INR (₹)

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
│   │   ├── middleware/           # auth (JWT protect), groupAuth (isMember/isAdmin), errorHandler
│   │   ├── models/               # User, Group, Expense, PersonalTransaction, Settlement, Budget
│   │   ├── controllers/          # One file per resource
│   │   ├── routes/               # auth.js, groups.js, users.js
│   │   ├── services/balanceService.js  # Core balance + debt-simplification algorithm
│   │   └── utils/                # asyncHandler, logger
│   └── .env.example              # Required environment variables
│
├── frontend/         # Expo app
│   ├── app/
│   │   ├── _layout.jsx           # Root: AuthProvider + RootGuard (auth redirects)
│   │   ├── auth/                 # login.jsx, register.jsx
│   │   ├── (tabs)/               # _layout.jsx, index.jsx, groups.jsx, transactions.jsx, profile.jsx
│   │   └── groups/[id].jsx       # Group detail (expenses, balances, members, settlements)
│   ├── context/AuthContext.jsx   # Global auth state, session restore on launch
│   ├── services/api.js           # Axios instance with dynamic BASE_URL + JWT interceptor
│   ├── services/auth.js          # AsyncStorage helpers for token/user persistence
│   └── constants/theme.js        # PC design tokens (colors)
│
└── docs/                         # Feature blueprint, MVP spec, dev plan, integration plan
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
npm run dev                   # starts on port 5000 with auto-reload
```

### Frontend

```bash
cd frontend
npm install
npx expo start                # scan the QR code with Expo Go
```

The app auto-detects your machine's LAN IP from Expo's Metro host — no manual IP configuration needed.

---

## API Overview

All endpoints under `/api/auth/` are public. Everything else requires `Authorization: Bearer <token>`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` |
| Groups | `GET/POST /api/groups` · `GET /api/groups/:id` |
| Members | `GET/POST /api/groups/:id/members` · `DELETE /api/groups/:id/members/:userId` |
| Group Expenses | `GET/POST /api/groups/:id/expenses` |
| Balances | `GET /api/groups/:id/balances` · `GET /api/users/me/summary` |
| Settlements | `GET/POST /api/groups/:id/settlements` |
| Personal Transactions | `GET/POST /api/users/me/transactions` · `DELETE /api/users/me/transactions/:id` |
| Dashboard | `GET /api/users/me/dashboard` |
| Budget | `GET/POST /api/users/me/budget` |

Group expense and balance endpoints require group membership (`isMember` middleware). The `isMember` middleware loads the group into `req.group`, so controllers do not re-fetch it.

---

## Key Design Decisions

**Two separate data scopes:**
- *Group expenses* — always tied to a `groupId`, split among members
- *Personal transactions* — tied to a `userId`, no group, track income and personal spending
- Both are aggregated together in the dashboard and budget calculations

**Balance algorithm** (`services/balanceService.js`):
Computes `credit[user] - debit[user]` across all group expenses and settlements, then runs a greedy debt-simplification pass to produce a minimal `debts[]` list (O(n log n)). This is the single source of truth — all balance-related endpoints call `calculateGroupBalances()`.

**Auth redirect logic** is owned entirely by `RootGuard` in `app/_layout.jsx`. Individual screens do not perform redirects.

---

## Development Status

### ✅ Phase 1 — MVP (Complete)

**Backend — all 6 weeks delivered:**
- Week 1: User auth (register, login, JWT middleware, bcrypt password hashing)
- Week 2: Groups and member management (create, list, add/remove members)
- Week 3: Group expenses (equal + exact splits, date/category filters) + Personal transactions (income/expense, all filters, delete)
- Week 4: Balance engine (net balance per member, debt simplification, cross-group summary)
- Week 5: Settlements (record, history)
- Week 6: Unified dashboard (group spend + personal spend + income + category breakdown) + Budget (set, track with status thresholds)

**Frontend — all screens built:**
- Auth: login and register with validation and error handling
- Groups tab: groups list with live balances, settlements history
- Group detail screen: expenses list, balances, members, record settlement
- Transactions tab: personal income/expense list with filters, add transaction, delete
- Dashboard tab: combined spend metrics, category breakdown, budget progress
- Profile tab

---

### 🔜 Phase 2 — Advanced Features (Next)

- Settlement optimization: upgrade the greedy algorithm to full minimum-cash-flow (graph-based, O(n log n)) to further reduce transaction counts
- Additional split types: percentage splits and share-based splits
- Edit and delete group expenses
- Recurring expenses with auto-add scheduling
- Push notifications: settlement reminders, budget threshold alerts

### 🔜 Phase 3 — Polish

- Spending charts and analytics (bar, pie, line)
- Rule-based behavioral insights ("You spent 42% on food this month")
- Data export: PDF and CSV
- UPI payment links for settlements
- UI animations and polish

---

## Environment Variables

See `backend/.env.example` for all required keys:

```
MONGO_URI       MongoDB Atlas connection string
PORT            API port (default: 5000)
JWT_SECRET      Strong random secret (32+ bytes)
JWT_EXPIRES_IN  Token lifespan (default: 7d)
NODE_ENV        development | production
CLIENT_URL      Allowed CORS origin (use * for dev)
```
