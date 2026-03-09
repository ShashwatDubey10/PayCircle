# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
PayCircle/
├── backend/                    # Node.js + Express API server
│   ├── src/
│   │   ├── index.js           # Express app setup, middleware registration, route mounting
│   │   ├── config/
│   │   │   └── db.js          # MongoDB Atlas connection
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT verification (protect middleware)
│   │   │   ├── groupAuth.js   # Group membership + admin checks (isMember, isAdmin)
│   │   │   └── errorHandler.js # Global error handler (5xx/4xx normalization)
│   │   ├── models/
│   │   │   ├── User.js        # User schema + bcrypt pre-save + matchPassword method
│   │   │   ├── Group.js       # Group schema (name, type enum, adminId, members array)
│   │   │   ├── Expense.js     # Expense schema (groupId, payerId, splits array, category enum)
│   │   │   ├── Settlement.js  # Settlement schema (groupId, fromUserId, toUserId, amount)
│   │   │   ├── PersonalTransaction.js # Personal transaction schema (userId, type, category, amount)
│   │   │   ├── Budget.js      # Budget schema (userId, month, amount)
│   │   │   └── Transaction.js # Legacy/unused model
│   │   ├── controllers/
│   │   │   ├── authController.js         # register, login, getMe
│   │   │   ├── groupController.js        # createGroup, getUserGroups, getGroup, members CRUD
│   │   │   ├── expenseController.js      # addExpense, getExpenses
│   │   │   ├── balanceController.js      # getGroupBalances, getUserSummary
│   │   │   ├── settlementController.js   # recordSettlement, getSettlements
│   │   │   ├── personalTransactionController.js # addTransaction, getTransactions, deleteTransaction
│   │   │   ├── dashboardController.js    # getDashboard (combined group + personal)
│   │   │   └── budgetController.js       # setBudget, setBudgetByCategory, getBudget
│   │   ├── routes/
│   │   │   ├── auth.js        # /api/auth/* endpoints (public: register, login; protected: getMe)
│   │   │   ├── groups.js      # /api/groups/* endpoints (all protected, some need isMember)
│   │   │   └── users.js       # /api/users/me/* endpoints (all protected, user-scoped)
│   │   ├── services/
│   │   │   └── balanceService.js # calculateGroupBalances (single source of truth for balance data)
│   │   └── utils/
│   │       ├── asyncHandler.js   # Wrapper to eliminate try/catch in controllers
│   │       └── logger.js         # Structured logger with color + tags
│   ├── package.json           # Express, Mongoose, JWT, bcryptjs, etc.
│   └── .env                   # MongoDB Atlas URI (needs <db_password> replaced)
│
├── frontend/                   # React Native + Expo app
│   ├── app/                    # Expo Router file-based navigation
│   │   ├── _layout.jsx        # Root layout: AuthProvider + ThemeProvider + Stack + RootGuard
│   │   ├── auth/
│   │   │   ├── login.jsx      # Login screen (email + password)
│   │   │   └── register.jsx   # Register screen (name + email + password)
│   │   ├── (tabs)/            # Tab bar layout
│   │   │   ├── _layout.jsx    # Bottom tab navigation (Dashboard, Groups, Transactions, Profile)
│   │   │   ├── index.jsx      # Dashboard screen (combined group + personal balance)
│   │   │   ├── groups.jsx     # Groups list + settlements tab
│   │   │   ├── transactions.jsx # Personal transactions list + filters
│   │   │   └── profile.jsx    # User profile settings
│   │   ├── groups/
│   │   │   └── [id].jsx       # Group detail screen (expenses, members, settlements)
│   │   └── budget.jsx         # Budget management screen
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state (user, token, loading) + login/register/logout methods
│   ├── services/
│   │   ├── api.js             # Axios instance with dynamic base URL + interceptors
│   │   └── auth.js            # AsyncStorage helpers (saveToken, getToken, saveUser, getUser, clearAuth)
│   ├── components/
│   │   └── haptic-tab.jsx     # Haptic feedback tab component
│   ├── constants/
│   │   └── theme.js           # PC design tokens (colors, spacing, etc.)
│   ├── metro.config.js        # Metro bundler config (default, no path alias tweaks)
│   ├── babel.config.js        # Babel preset config
│   ├── tsconfig.json          # Path aliases: @/ → frontend/
│   ├── package.json           # React Native, Expo, Axios, AsyncStorage, etc.
│   └── app.json               # Expo app configuration
│
├── docs/                       # Project documentation
│   ├── PayCircle_Feature_Blueprint.md  # Feature spec + user stories
│   ├── PayCircle_MVP_Specification.md  # MVP scope, data models, API spec
│   └── PayCircle_Frontend_Integration_Plan.md # Frontend integration notes
│
├── .planning/                  # GSD planning artifacts
│   └── codebase/              # Codebase analysis docs (this directory)
│
├── CLAUDE.md                   # Development guidelines for Claude instances
├── README.md                   # Project overview, setup, tech stack
└── .gitignore                  # Standard Node.js ignores
```

## Directory Purposes

**`backend/src/`:**
- Purpose: All backend application code
- Contains: Express app, middleware, models, controllers, routes, services, utilities
- Key files: `index.js` (entry point), models/ (data layer), controllers/ (HTTP handlers), services/ (business logic)

**`backend/src/middleware/`:**
- Purpose: Cross-cutting request processing
- Contains: Auth middleware (JWT), group auth middleware (membership checks), global error handler
- Key files: `auth.js` (protect — verifies token, loads user), `groupAuth.js` (isMember, isAdmin), `errorHandler.js` (catches all throws, normalizes response)

**`backend/src/models/`:**
- Purpose: Data schema and persistence layer
- Contains: Mongoose schemas with validation, indexes, instance methods
- Key files: User (auth + profile), Group (collections), Expense (financial), Settlement (payments), PersonalTransaction (solo transactions), Budget (spending limits)

**`backend/src/controllers/`:**
- Purpose: HTTP request handlers and input validation
- Contains: Eight controller files, each with multiple route handlers
- Pattern: All wrapped in asyncHandler (no try/catch); validate input → call service/model → respond
- Key files: groupController.js (largest, handles group operations), balanceController.js (calls balanceService), authController.js (JWT issuance)

**`backend/src/routes/`:**
- Purpose: Route definitions and middleware attachment
- Contains: Three route modules (auth, groups, users), mounted at app level
- Pattern: Each route file requires its controllers + middleware, defines route + HTTP verb + handlers

**`backend/src/services/`:**
- Purpose: Business logic and multi-model operations
- Contains: balanceService.js (single source of truth for balance calculations)
- Access: Called only by controllers, never directly by routes

**`backend/src/utils/`:**
- Purpose: Reusable utility functions
- Contains: asyncHandler (error-handling wrapper), logger (structured logging)

**`backend/config/`:**
- Purpose: External service configuration
- Contains: MongoDB Atlas connection setup

**`frontend/app/`:**
- Purpose: Expo Router file-based navigation structure
- Pattern: File = Route; folders with `_layout.jsx` = layout/group
- Key: `_layout.jsx` files are layouts (Stack, Tabs); other `.jsx` are screens

**`frontend/app/auth/`:**
- Purpose: Public auth screens (pre-login)
- Contains: login.jsx, register.jsx
- Access: RootGuard redirects unauthenticated users here

**`frontend/app/(tabs)/`:**
- Purpose: Tab bar container and screens
- Contains: `_layout.jsx` (Tabs setup), index.jsx (dashboard), groups.jsx, transactions.jsx, profile.jsx
- Access: RootGuard redirects authenticated users here

**`frontend/app/groups/`:**
- Purpose: Dynamic group detail screen
- Contains: `[id].jsx` (param-based routing)
- Pattern: `[id]` creates dynamic route `/groups/:id`

**`frontend/context/`:**
- Purpose: Global state management
- Contains: AuthContext (auth state + methods)
- Usage: Wrapped around root layout; consumed via useAuth() hook

**`frontend/services/`:**
- Purpose: API and storage utilities
- Contains: api.js (Axios instance), auth.js (AsyncStorage helpers)
- Access: Called by context, controllers, components

**`frontend/constants/`:**
- Purpose: Design and configuration tokens
- Contains: theme.js (PC design token object with colors)
- Usage: All UI must use PC colors, never hardcode hex values

**`frontend/components/`:**
- Purpose: Reusable UI components
- Contains: haptic-tab.jsx (tab icon with haptic feedback)

## Key File Locations

**Entry Points:**

- `backend/src/index.js` — Backend HTTP server entry; starts Express, mounts routes, begins listening
- `frontend/app/_layout.jsx` — Frontend root; wraps app in providers, sets up navigation, triggers auth restore

**Configuration:**

- `backend/.env` — MongoDB Atlas URI (required: set db_password)
- `frontend/constants/theme.js` — All UI colors (PC token object)
- `frontend/metro.config.js` — Metro bundler config
- `frontend/tsconfig.json` — Path aliases (@/ → frontend/)

**Core Logic:**

- `backend/src/services/balanceService.js` — Balance calculation algorithm (single source of truth)
- `backend/src/utils/logger.js` — Structured logging (used everywhere)
- `frontend/context/AuthContext.jsx` — Auth state + session restore (wraps entire app)
- `frontend/services/api.js` — Axios instance + JWT injection + error normalization

**Testing:**

- No test files present (not part of MVP)

## Naming Conventions

**Files:**

- Controllers: `[domain]Controller.js` (e.g., `authController.js`, `groupController.js`)
- Models: PascalCase (e.g., `User.js`, `Expense.js`)
- Routes: camelCase plural (e.g., `auth.js`, `groups.js`, `users.js`)
- Utilities: camelCase (e.g., `asyncHandler.js`, `logger.js`)
- React screens/components: PascalCase if component, lowercase if screen file (e.g., `HapticTab.jsx`, `login.jsx`)

**Variables/Functions (Backend):**

- Middleware: `protect`, `isMember`, `isAdmin` (verb forms describing action)
- Controller functions: camelCase, verb-first (e.g., `createGroup`, `getUserGroups`, `addExpense`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `VALID_TYPES`, `IS_PROD`)

**Variables/Functions (Frontend):**

- Hooks: `useAuth` (use* prefix)
- Components: PascalCase (e.g., `AuthProvider`, `RootGuard`, `TabIcon`)
- Exported functions: camelCase (e.g., `saveToken`, `getToken`)

**Directories:**

- Plural names for collections (e.g., `controllers/`, `models/`, `services/`, `routes/`)
- `(tabs)` uses Expo Router group syntax for layout scoping
- `[id]` uses Expo Router dynamic segment syntax for parameterized routes

## Where to Add New Code

**New Feature (Backend):**

- Model: `backend/src/models/FeatureName.js`
- Controller: `backend/src/controllers/featureController.js` (export methods like `getFeature`, `createFeature`)
- Route: Add to `backend/src/routes/` (if domain-specific) or create new route file
- Service: `backend/src/services/featureService.js` if business logic is complex
- Middleware: `backend/src/middleware/featureCheck.js` if cross-cutting concern

**New API Endpoint (Backend):**

1. Add route handler to appropriate controller file
2. Update route file to include handler:
   ```javascript
   router.post('/path', [middleware], controllerMethod);
   ```
3. Wrap controller logic in asyncHandler (no try/catch)
4. Return `res.json({ success, data/message })`

**New Frontend Screen:**

- Create `.jsx` file in `app/` matching Expo Router structure
- If needs params (like group ID), use `[param].jsx` naming
- Import and use `useAuth()` for auth state
- Use `api` service for HTTP calls
- Use `PC` colors from theme for styling

**New Frontend Component:**

- Create `.jsx` file in `frontend/components/`
- Follow React functional component pattern
- Export as default
- Use PC theme colors only

**New Shared Utility:**

- Backend: `backend/src/utils/utilityName.js`
- Frontend: `frontend/services/utilityName.js` (or keep in an existing service file if small)

**New Group Domain:**

If adding a whole new feature area (e.g., "Recurring Expenses"):
- Backend: Create `backend/src/models/RecurringExpense.js`, `backend/src/controllers/recurringExpenseController.js`, new route file or add to existing
- Frontend: Create `frontend/app/recurring/` folder with screens, add tab to tab bar if needed

## Special Directories

**`backend/node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (created by npm install)
- Committed: No (.gitignore)

**`frontend/node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (created by npm install)
- Committed: No (.gitignore)

**`.planning/`:**
- Purpose: GSD codebase analysis and planning documents
- Generated: Yes (by /gsd:map-codebase and /gsd:plan-phase)
- Committed: Yes (.planning/ not in .gitignore)

**`frontend/.expo/`:**
- Purpose: Expo CLI local cache (device registry, settings)
- Generated: Yes (created by expo commands)
- Committed: No (.gitignore)

**`docs/`:**
- Purpose: Project specifications and design docs
- Generated: No (hand-written)
- Committed: Yes
- Contains: Feature blueprint, MVP spec, integration plan

---

*Structure analysis: 2026-03-09*
