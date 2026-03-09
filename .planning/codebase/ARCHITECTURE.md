# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Layered monorepo with two independent applications (backend API + React Native frontend) following express-controller-service-model patterns on backend and context-driven state management on frontend.

**Key Characteristics:**
- **Middleware-first request handling** — requests flow through security → logging → auth → route-specific guards → controller → service logic
- **Separation of concerns** — controllers handle HTTP concerns, services handle business logic, models define data shapes
- **Single source of truth for balances** — `balanceService.calculateGroupBalances()` is invoked by all balance endpoints
- **Frontend-agnostic API** — backend exposes RESTful endpoints; frontend consumes via Axios with interceptors
- **Session-based auth with async persistence** — JWT tokens stored in AsyncStorage; AuthContext restores session on app launch

## Layers

**Middleware Layer:**
- Purpose: Cross-cutting concerns (security, logging, validation, auth guards)
- Location: `backend/src/middleware/`
- Contains: `auth.js` (JWT verification), `groupAuth.js` (membership + admin checks), `errorHandler.js` (global error handler)
- Depends on: Logger, User/Group models
- Used by: All routes via `app.use()` or route-specific attachment

**Controller Layer:**
- Purpose: HTTP request/response handling, input validation, delegating to services
- Location: `backend/src/controllers/`
- Contains: Auth, Group, Expense, Balance, Settlement, Transaction, Dashboard, Budget controllers
- Pattern: Each controller function is wrapped in `asyncHandler()` — never use `try/catch`, always `throw` errors for global handler to catch
- Depends on: Models, Services, Logger
- Used by: Route handlers

**Service Layer:**
- Purpose: Business logic, complex calculations, multi-model operations
- Location: `backend/src/services/`
- Contains: `balanceService.js` (calculates net balances + simplified debt list via greedy algorithm)
- Depends on: Models
- Used by: Controllers (balance operations are always routed through this service)

**Model Layer:**
- Purpose: Data schema definition and persistence
- Location: `backend/src/models/`
- Contains: User, Group, Expense, Settlement, PersonalTransaction, Budget
- Pattern: Mongoose schemas with validation, indexes, and methods (e.g., `User.matchPassword()`)
- Depends on: Mongoose, bcrypt (for User pre-save)
- Used by: Controllers, Services, Middleware

**Utility Layer:**
- Purpose: Reusable helpers
- Location: `backend/src/utils/`
- Contains: `asyncHandler.js` (wraps async controllers), `logger.js` (structured logging with tags and levels)
- Used by: All layers

## Data Flow

**Group Expense Transaction:**

1. POST `/api/groups/:id/expenses` arrives
2. Express parses JSON body
3. HTTP logger middleware captures request
4. `protect` middleware verifies JWT, attaches `req.user`
5. `isMember` middleware loads Group doc, checks membership, attaches `req.group`
6. `expenseController.addExpense()` is invoked (wrapped in asyncHandler)
7. Controller validates input, calls `Expense.create()`
8. Service layer (if involved) computes splits
9. Controller returns 201 + expense doc
10. HTTP logger intercepts response, logs timing
11. Response sent to client

**Error during any step:** Thrown error is caught by asyncHandler, passed to global `errorHandler` middleware, returns 4xx/5xx + message.

**Balance Calculation Flow:**

1. GET `/api/groups/:id/balances` or `/api/users/me/summary`
2. `balanceController.getGroupBalances()` calls `calculateGroupBalances(groupId)`
3. Service fetches all expenses + settlements for group
4. For each expense: credits payer, debits all split recipients
5. For each settlement: credits sender, debits receiver
6. Builds member balance list (totalPaid, totalOwed, netBalance)
7. Runs greedy algorithm to simplify debts (matches creditors to debtors)
8. Returns `{ members, debts }` with minimal payment graph

**State Management (Frontend):**

1. App launches → `RootLayout` wraps app in `<AuthProvider>`
2. `AuthProvider.useEffect` on mount attempts to restore session:
   - Reads stored JWT from AsyncStorage
   - Calls `GET /api/auth/me` to verify token still valid
   - If valid: loads user into context state
   - If invalid/expired: clears storage, user stays null
3. `RootGuard` watches `user` + `loading` state, redirects based on auth status
4. Components call `useAuth()` hook to access `{ user, token, loading, login, register, logout }`
5. API requests automatically attach JWT via Axios request interceptor
6. 401 responses clear token + wipe storage, triggering redirect to login

## Key Abstractions

**AsyncHandler Wrapper:**
- Purpose: Eliminate try/catch boilerplate in controllers, unify error handling
- Examples: All controller functions in `backend/src/controllers/`
- Pattern: `const fn = asyncHandler(async (req, res) => { /* no try/catch needed */ })`
- Error thrown anywhere is caught and passed to global errorHandler

**Middleware Chain Guard Pattern:**
- Purpose: Sequential validation before reaching controller
- Examples: `protect` → `isMember` → `isAdmin` (for admin-only operations)
- Usage: Applied via `router.use()` (global) or route-level attachment
- Effect: Each middleware enriches request (e.g., `req.user`, `req.group`) for downstream handlers

**Balance Service Single Source of Truth:**
- Purpose: Prevent balance calculation drift across different endpoints
- Location: `backend/src/services/balanceService.js`
- Invoked by: `balanceController.getGroupBalances()`, dashboard endpoint, user summary endpoint
- Ensures: All balance data originates from same algorithm, no inconsistencies

**AuthContext + Async Persistence:**
- Purpose: Restore session across app restarts without UI delays
- Location: `frontend/context/AuthContext.jsx` + `frontend/services/auth.js`
- Pattern: `loading` flag prevents rendering until restore completes; `RootGuard` uses it to delay redirects
- Effect: Users stay logged in across app termination if token still valid

**Axios Interceptors (Request + Response):**
- Purpose: Centralize JWT injection and error normalization
- Location: `frontend/services/api.js`
- Request: Attaches `Authorization: Bearer <token>` header from AsyncStorage
- Response: Normalizes all errors to plain `Error` objects with `.message` string, handles 401 token expiry

## Entry Points

**Backend HTTP Server:**
- Location: `backend/src/index.js`
- Triggers: Node process starts on PORT (5000 default)
- Responsibilities: Express app setup, middleware registration, route mounting, server start

**Backend Route Groups:**
- `POST/GET /api/auth/...` (`backend/src/routes/auth.js`): Register, login, verify session
- `POST/GET/DELETE /api/groups/...` (`backend/src/routes/groups.js`): Group CRUD, members, expenses, balances, settlements
- `GET/POST/DELETE /api/users/me/...` (`backend/src/routes/users.js`): Dashboard, budget, personal transactions

**Frontend Root Navigation:**
- Location: `frontend/app/_layout.jsx`
- Triggers: App launch
- Responsibilities: Wraps app in `AuthProvider` + `ThemeProvider`, sets up Stack navigator, attaches `RootGuard` for auto-redirect

**Frontend Tab Navigation:**
- Location: `frontend/app/(tabs)/_layout.jsx`
- Triggers: When authenticated user navigates past login screen
- Responsibilities: Bottom tab bar with 4 screens (Dashboard, Groups, Transactions, Profile)

**Frontend Auth Flows:**
- Login: `frontend/app/auth/login.jsx` → calls `AuthContext.login()` → API call → stores token + user
- Register: `frontend/app/auth/register.jsx` → calls `AuthContext.register()` → API call → stores token + user

## Error Handling

**Strategy:** Throw-first in controllers, catch-all in global middleware. All errors normalized to status code + message.

**Patterns:**

- **Validation errors (400):** Controller checks input, returns 400 before any DB operation
- **Auth errors (401):** `protect` middleware rejects missing/invalid JWT; frontend clears token on 401 response
- **Authorization errors (403):** `isMember`/`isAdmin` reject non-members/non-admins before reaching controller
- **Not found (404):** Controllers check document existence, return 404 if missing
- **Server errors (500):** Unhandled exceptions caught by asyncHandler, passed to errorHandler, logged with stack trace

**Logging:**
- 5xx errors logged as `logger.error()` with full stack trace
- 4xx errors logged as `logger.warn()`
- Info events (auth success, group created) logged as `logger.info()`
- Debug (DB queries, detailed state) logged as `logger.debug()` — silenced in production

## Cross-Cutting Concerns

**Logging:** Custom lightweight logger in `backend/src/utils/logger.js` with colorized output and optional metadata. Tags: `SERVER`, `DB`, `HTTP`, `AUTH`, `GROUP`, `EXPENSE`, `TXN`, `SETTLE`, `BALANCE`, `DASH`, `BUDGET`, `ERR`.

**Validation:**
- Input validation at controller entry (required fields, string length, enum values)
- Mongoose schema validation at model layer (minlength, enum, required)
- No separate validation middleware — inline in controllers

**Authentication:**
- JWT in Authorization header (`Bearer <token>`)
- Verified by `protect` middleware on all protected routes
- User document (minus password) attached to `req.user` for downstream use

**Authorization:**
- Role-based: Group admin checks in controllers via `group.adminId.toString() === req.user._id.toString()`
- Membership checks: `isMember` middleware verifies user is in group.members array
- Ownership checks: Personal transactions verified user owns them before delete/update

**Database Indexes:**
- Expense model: composite index on `(groupId, date)` for efficient sorting + filtering by group
- User model: unique index on email for auth queries
- No indexes on foreign key refs themselves — Mongoose handles via populate()

---

*Architecture analysis: 2026-03-09*
