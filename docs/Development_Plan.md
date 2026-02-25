# PayCircle — Development Plan

**Project:** Group Expense Management + Personal Finance Tracker
**Stack:** React Native (Expo) + Node.js/Express + MongoDB Atlas
**MVP Target:** 6–8 Weeks
**Date:** February 2026

---

## Overview

Development is split into two parallel tracks — **Backend** (built first) and **Frontend** (built against the stable API). The app covers two distinct scopes:

- **Group Finance** — shared expenses, balances, and settlements within a group
- **Personal Finance** — individual income/expense tracking independent of any group

Both scopes feed into a unified **Dashboard** and **Budget** system.

---

## Data Models

```javascript
// Users
{
  name, email, passwordHash, phone, avatar,
  walletBalance, isVerified, createdAt
}

// Groups
{
  name,
  type: enum[Roommates, Trip, Mess, Miscellaneous],
  adminId: ObjectId,
  members: [ObjectId],
  createdAt
}

// Expenses  (group-linked only)
{
  groupId: ObjectId,          // required — always group-scoped
  amount: Number,
  payerId: ObjectId,
  date: Date,
  category: enum[Food, Travel, Utilities, Miscellaneous],
  notes: String,
  splitType: enum[equal, exact],
  splits: [{ userId: ObjectId, amount: Number }],
  createdAt
}

// PersonalTransactions  (user-owned, no group)
{
  userId: ObjectId,           // required — always user-scoped
  type: enum[income, expense],
  amount: Number,
  category: enum[Food, Travel, Utilities, Entertainment,
                 Salary, Freelance, Investment, Health,
                 Shopping, Miscellaneous],
  date: Date,
  notes: String,
  createdAt
}

// Settlements
{
  groupId: ObjectId,
  fromUserId: ObjectId,
  toUserId: ObjectId,
  amount: Number,
  date: Date,
  notes: String,
  createdAt
}

// Budgets
{
  userId: ObjectId,
  month: String,              // "YYYY-MM"
  amount: Number,             // overall monthly budget
  createdAt
}
```

> **Design decision:** Group expenses and personal transactions are separate collections with no overlap.
> The dashboard aggregates both together for unified spending insights.

---

## Complete API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/groups` | Yes | Create group |
| GET | `/api/groups` | Yes | Get all groups user belongs to |
| GET | `/api/groups/:id` | Yes | Get group details |
| POST | `/api/groups/:id/members` | Yes (Admin) | Add member by email |
| DELETE | `/api/groups/:id/members/:userId` | Yes (Admin) | Remove member |
| GET | `/api/groups/:id/members` | Yes | List all members |
| POST | `/api/groups/:id/expenses` | Yes | Add group expense |
| GET | `/api/groups/:id/expenses` | Yes | Get group expenses (filterable) |
| GET | `/api/groups/:id/balances` | Yes | Group balance overview |
| GET | `/api/users/me/summary` | Yes | Total owe/owed across all groups |
| POST | `/api/groups/:id/settlements` | Yes | Record a settlement |
| GET | `/api/groups/:id/settlements` | Yes | Settlement history |
| POST | `/api/users/me/transactions` | Yes | Add personal transaction |
| GET | `/api/users/me/transactions` | Yes | Get personal transactions (filterable) |
| DELETE | `/api/users/me/transactions/:id` | Yes | Delete a personal transaction |
| GET | `/api/users/me/dashboard` | Yes | Unified dashboard metrics |
| POST | `/api/users/me/budget` | Yes | Set monthly budget |
| GET | `/api/users/me/budget` | Yes | Get budget status |

---

## Phase 1: Backend (Weeks 1–6)

### Week 1 — Authentication

> Foundation for all protected routes. Already ~80% done from initial scaffolding.

| Task | Description | Status |
|------|-------------|--------|
| Auth routes | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | ✅ Done |
| User model | bcrypt pre-save hook, `matchPassword` method | ✅ Done |
| JWT middleware | `protect` middleware for all guarded routes | ✅ Done |
| Error handler | Global error handling middleware | ✅ Done |
| Input validation | Validate name (2–50 chars), email format, password (8+ chars, alphanumeric) | ⬜ Todo |

**Endpoints delivered:**
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me          (protected)
```

---

### Week 2 — Groups & Members

> Core organizational unit. All group expenses live inside groups.

| Task | Description | Status |
|------|-------------|--------|
| Group model | `name`, `type` enum, `adminId`, `members[]` | ⬜ Todo |
| Create group | Creator auto-assigned as Admin | ⬜ Todo |
| Get user's groups | List all groups current user belongs to | ⬜ Todo |
| Get group by ID | Group details with member list | ⬜ Todo |
| Add member (Admin) | Search by email, add as Member role | ⬜ Todo |
| Remove member (Admin) | Cannot remove if last admin | ⬜ Todo |
| List members | Name, email, role for all members | ⬜ Todo |

**Endpoints delivered:**
```
POST   /api/groups
GET    /api/groups
GET    /api/groups/:id
POST   /api/groups/:id/members          (admin only)
DELETE /api/groups/:id/members/:userId  (admin only)
GET    /api/groups/:id/members
```

---

### Week 3 — Group Expenses

> Core group feature. Two split types with proper validation.

| Task | Description | Status |
|------|-------------|--------|
| Expense model | `groupId`, `amount`, `payerId`, `date`, `category`, `notes`, `splitType`, `splits[]` | ⬜ Todo |
| Equal split logic | `amount / memberCount`, rounded to 2 decimal places | ⬜ Todo |
| Exact split logic | Validate `sum(splits) === total amount` | ⬜ Todo |
| Expense validation | Amount > 0, ≤ ₹1,00,000; date not future, not >1 year past | ⬜ Todo |
| Get expenses | Chronological list (newest first), with filter support | ⬜ Todo |
| Filter by date | Last 7d / 30d / 3 months / all time | ⬜ Todo |
| Filter by category | Food / Travel / Utilities / Miscellaneous / All | ⬜ Todo |

**Endpoints delivered:**
```
POST   /api/groups/:id/expenses
GET    /api/groups/:id/expenses         (supports ?date=&category=)
```

**Split types:**
- `equal` — divide total evenly among all members
- `exact` — user-specified per-member amounts (must sum to total)

---

### Week 3 — Personal Transactions *(new)*

> Standalone income/expense entries owned by a single user, not linked to any group.

| Task | Description | Status |
|------|-------------|--------|
| PersonalTransaction model | `userId`, `type` (income/expense), `amount`, `category`, `date`, `notes` | ⬜ Todo |
| Add personal transaction | Validate type, amount > 0, valid category | ⬜ Todo |
| Get personal transactions | Chronological, newest first; supports filters | ⬜ Todo |
| Filter by type | income / expense / all | ⬜ Todo |
| Filter by date | Last 7d / 30d / 3 months / all time | ⬜ Todo |
| Filter by category | All 10 personal categories | ⬜ Todo |
| Delete personal transaction | Soft validation: only owner can delete | ⬜ Todo |

**Endpoints delivered:**
```
POST   /api/users/me/transactions
GET    /api/users/me/transactions       (supports ?type=&date=&category=)
DELETE /api/users/me/transactions/:id
```

**Personal transaction categories (expanded from group categories):**

| Category | Type |
|----------|------|
| Food | Expense |
| Travel | Expense |
| Utilities | Expense |
| Entertainment | Expense |
| Health | Expense |
| Shopping | Expense |
| Miscellaneous | Expense |
| Salary | Income |
| Freelance | Income |
| Investment | Income |

---

### Week 4 — Balance Engine

> Group-only feature. Calculates who owes whom within each group.

| Task | Description | Status |
|------|-------------|--------|
| Balance service | `totalPaid - totalOwed` per user using expense splits | ⬜ Todo |
| Settlement adjustment | Settlements shift balances between two users | ⬜ Todo |
| Group balances | Net balance per member + simplified debts list | ⬜ Todo |
| Personal group summary | Total owed + total to receive across all groups | ⬜ Todo |

**Balance calculation logic:**
```
For each user in a group:
  totalPaid  = SUM(expenses where user is payer)
  totalOwed  = SUM(user's share in all group expenses)
  netBalance = totalPaid - totalOwed

  netBalance > 0  → User is owed money  (green)
  netBalance < 0  → User owes money     (red)
  netBalance = 0  → Settled up          (gray)
```

**Endpoints delivered:**
```
GET    /api/groups/:id/balances
GET    /api/users/me/summary
```

---

### Week 5 — Settlements

> Manual settle-up for group debts. Adjusts net balances between two members.

| Task | Description | Status |
|------|-------------|--------|
| Settlement model | `groupId`, `fromUserId`, `toUserId`, `amount`, `date`, `notes` | ⬜ Todo |
| Record settlement | Validates both users are group members, amount > 0 | ⬜ Todo |
| Balance update on settle | Recalculates net balances for both parties | ⬜ Todo |
| Settlement history | Chronological list, newest first | ⬜ Todo |

**Endpoints delivered:**
```
POST   /api/groups/:id/settlements
GET    /api/groups/:id/settlements
```

---

### Week 6 — Unified Dashboard & Budget

> Aggregates both group expenses and personal transactions into one financial view.

| Task | Description | Status |
|------|-------------|--------|
| Dashboard — group spend | User's share in group expenses this month | ⬜ Todo |
| Dashboard — personal spend | Sum of personal expense transactions this month | ⬜ Todo |
| Dashboard — personal income | Sum of personal income transactions this month | ⬜ Todo |
| Dashboard — combined total spent | Group share + personal expenses combined | ⬜ Todo |
| Dashboard — total owed | From group balance engine | ⬜ Todo |
| Dashboard — category breakdown | Top 4 categories across both sources + Others | ⬜ Todo |
| Dashboard — net cashflow | Personal income − personal expenses (current month) | ⬜ Todo |
| Budget model | `userId`, `month` (YYYY-MM), `amount` | ⬜ Todo |
| Set budget | Upsert for current month | ⬜ Todo |
| Budget status | Budget amount, spent (combined), remaining, usage % | ⬜ Todo |
| Wire all routes | Register all route files in `src/index.js` | ⬜ Todo |
| Backend smoke test | Verify all endpoints with Postman/Thunder Client | ⬜ Todo |

**Endpoints delivered:**
```
GET    /api/users/me/dashboard
POST   /api/users/me/budget
GET    /api/users/me/budget
```

**Dashboard response shape:**
```javascript
{
  totalSpent: {
    group: Number,          // sum of group expense shares
    personal: Number,       // sum of personal expense entries
    combined: Number        // group + personal
  },
  personalIncome: Number,   // sum of income entries this month
  netCashflow: Number,      // personalIncome - personal expenses
  totalOwed: Number,        // across all groups
  categoryBreakdown: [
    { category: String, amount: Number, percentage: Number }
  ]
}
```

**Budget "spent" includes:** group expense shares + personal expense transactions

**Budget usage thresholds:**

| Usage | Color |
|-------|-------|
| 0–70% | Green |
| 71–90% | Yellow/Orange |
| 91–100% | Red |
| > 100% | Dark red |

---

## Phase 2: Frontend (Weeks 1–6, after backend is stable)

### Pre-work — Navigation + API Layer

| Task | Description | Status |
|------|-------------|--------|
| Navigation structure | Expo Router: auth stack + main tabs (Dashboard, Groups, Personal, Profile) | ⬜ Todo |
| Protected routes | Redirect to login if no JWT in AsyncStorage | ⬜ Todo |
| Axios client | Base URL from env, JWT auto-attached via interceptor | ⬜ Todo |
| Service files | `authService`, `groupService`, `expenseService`, `balanceService`, `settlementService`, `personalTransactionService`, `dashboardService` | ⬜ Todo |

> The main tab bar has **4 tabs:** Dashboard · Groups · Personal · Profile

---

### Week 1 — Auth Screens

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `RegisterScreen` | Name, email, password, confirm password; field-level errors | ⬜ Todo |
| `LoginScreen` | Email, password; "Invalid credentials" on failure | ⬜ Todo |

---

### Week 2 — Group & Member Screens

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `GroupListScreen` | All user's groups with type badge; Create Group button | ⬜ Todo |
| `CreateGroupScreen` | Name input, type dropdown | ⬜ Todo |
| `GroupDetailScreen` | Tabs: Expenses / Balances / Members / Settlements | ⬜ Todo |
| `MemberListScreen` | List with role badges; Remove button for admin | ⬜ Todo |
| `AddMemberScreen` | Email search; Add to Group button | ⬜ Todo |

---

### Week 3 — Group Expense Screens

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `AddGroupExpenseScreen` | Amount, payer dropdown, date, category, notes, split type toggle | ⬜ Todo |
| Equal split UI | Per-person amount preview calculated automatically | ⬜ Todo |
| Exact split UI | Per-member inputs, running total, error if mismatch | ⬜ Todo |
| `GroupExpenseHistoryScreen` | Scrollable list; date + category filter dropdowns | ⬜ Todo |

---

### Week 3 — Personal Transaction Screens *(new)*

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `PersonalTransactionListScreen` | All personal transactions; income/expense toggle filter; date + category filter | ⬜ Todo |
| `AddPersonalTransactionScreen` | Income/Expense type toggle; amount; expanded category dropdown (10 options); date; notes | ⬜ Todo |
| Income/Expense summary bar | Total income (green) vs total expenses (red) for current month at top of list | ⬜ Todo |
| Swipe to delete | Swipe left on transaction to reveal Delete action | ⬜ Todo |

**Personal tab structure:**
```
Personal (tab)
  ├── Summary bar: Income ₹X  |  Expenses ₹Y  |  Net ₹Z
  ├── [+ Add Transaction] button
  ├── Filters: All / Income / Expense  +  Date  +  Category
  └── Transaction list (newest first)
```

---

### Week 4 — Balance Screens

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `GroupBalanceScreen` | Member net balances (green/red/gray); "X owes Y ₹Z" debt list | ⬜ Todo |
| `PersonalGroupSummaryScreen` | You Owe (red card) + You Are Owed (green card); group breakdown on tap | ⬜ Todo |

---

### Week 5 — Settlement Screens

| Screen | Key Elements | Status |
|--------|-------------|--------|
| `RecordSettlementScreen` | From/To member dropdowns, amount, date, optional note | ⬜ Todo |
| `SettlementHistoryScreen` | Chronological list: From → To, amount, date | ⬜ Todo |

---

### Week 6 — Dashboard Screen

| Screen / Section | Key Elements | Status |
|--------|-------------|--------|
| `DashboardScreen` | Unified view combining group + personal data | ⬜ Todo |
| Spent this month | Group share + personal expenses, shown separately and combined | ⬜ Todo |
| Net cashflow card | Personal income − personal expenses (green if positive) | ⬜ Todo |
| Total owed card | From group balances (red if > 0) | ⬜ Todo |
| Category breakdown | Top 4 categories from combined spend + Others | ⬜ Todo |
| Budget section | Budget / Spent (combined) / Remaining + progress bar | ⬜ Todo |
| Set Budget | Inline input or modal to upsert monthly budget | ⬜ Todo |

---

## Phase 3: Testing & Polish (Weeks 7–8)

| Task | Description | Status |
|------|-------------|--------|
| Group journey | Register → create group → add members → add expenses → view balances → settle | ⬜ Todo |
| Personal journey | Add income + expense entries → view history → filter → delete | ⬜ Todo |
| Dashboard accuracy | Verify combined totals and category percentages are correct | ⬜ Todo |
| Budget accuracy | Confirm budget "spent" includes both group shares and personal expenses | ⬜ Todo |
| Balance math | Cross-check all group balance calculations against spec examples | ⬜ Todo |
| UI color coding | Green/red/gray for balances; income vs expense colors; budget thresholds | ⬜ Todo |
| Error + empty states | Network errors, no transactions yet, zero balance states on all screens | ⬜ Todo |
| Loading states | Skeleton loaders or spinners on all data-fetching screens | ⬜ Todo |
| Bug fixes | Fix all issues found during testing | ⬜ Todo |

---

## Post-MVP Roadmap

### Version 2.0 — Advanced Features
- Settlement optimization algorithm (minimum cash flow, O(n log n))
- Percentage and share-based splits
- Edit and delete group expenses
- Recurring expenses with auto-add
- Push notifications (settlement reminders, budget alerts)
- Edit personal transactions

### Version 2.5 — Analytics & Insights
- Spending charts (bar, pie, line graphs)
- Behavioral insights (rule-based spending pattern detection)
- Category-wise budgets with alerts
- Overspending prediction (moving average formula)
- Data export — PDF and CSV
- Group analytics dashboard

### Version 3.0 — Future Scope
- UPI payment integration + QR code for settlements
- AI-powered spending insights
- Receipt OCR for auto expense entry
- Multi-currency support
- Social features

---

**Document Status:** Active
**Last Updated:** February 2026
**Spec References:** `PayCircle_MVP_Specification.md`, `PayCircle_Feature_Blueprint.md`
