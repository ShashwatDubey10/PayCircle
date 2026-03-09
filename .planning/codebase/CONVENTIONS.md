# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- Controllers: PascalCase with "Controller" suffix — `authController.js`, `expenseController.js`, `groupController.js`
- Models: PascalCase — `User.js`, `Group.js`, `Expense.js`, `Settlement.js`, `Budget.js`
- Services: camelCase — `balanceService.js`
- Utilities: camelCase — `asyncHandler.js`, `logger.js`
- Middleware: camelCase — `auth.js`, `errorHandler.js`, `groupAuth.js`
- Routes: plural camelCase — `auth.js`, `groups.js`, `users.js`
- Frontend screens: lowercase with dots for nested routes — `index.jsx`, `_layout.jsx`, `groups/[id].jsx`
- Frontend components: PascalCase for sub-components defined within files
- Frontend services/context: camelCase — `api.js`, `auth.js`, `AuthContext.jsx`

**Functions:**
- Route handlers and middleware: camelCase — `createGroup`, `addExpense`, `protect`, `isMember`
- Helper functions: camelCase — `calculateGroupBalances`, `generateToken`, `isValidEmail`
- Frontend component functions: camelCase for helpers — `getGreeting()`, `getInitials()`, `formatDate()`, `formatMonth()`
- Constants within functions: UPPER_SNAKE_CASE — `VALID_TYPES`, `VALID_CATS`, `CATEGORY_ICONS`

**Variables:**
- Local state: camelCase — `loading`, `refreshing`, `budgetInput`, `netGroupBalance`
- Database fields: camelCase — `payerId`, `groupId`, `walletBalance`, `totalOwed`, `totalToReceive`
- Object destructuring follows property names — `const { name, email, password } = req.body`

**Types & Enums:**
- Model enum values: PascalCase — `Roommates`, `Trip`, `Mess`, `Miscellaneous`
- Expense categories: PascalCase — `Food`, `Travel`, `Utilities`, `Miscellaneous`
- Split types: lowercase — `equal`, `exact`
- Transaction types: lowercase — `income`, `expense`
- Status values: lowercase — `healthy`, `warning`, `critical`, `over`

## Code Style

**Formatting:**
- No explicit Prettier config in root; frontend uses `eslint-config-expo` which extends ESLint defaults
- Consistent spacing: 2-space indentation throughout (observed in all files)
- Line length: Mixed — some lines >100 chars (especially in backend routes where readability prioritized)
- Trailing commas: Not consistently used; omit for arrays unless multiline
- Quotes: Single quotes in JavaScript, no explicit enforcement

**Linting:**
- Backend: No ESLint config detected; relies on manual convention adherence
- Frontend: Uses `eslint-config-expo` (flat config at `frontend/eslint.config.js`)
- Run command: `npm run lint` (frontend only)

**Commenting Style:**
- Section dividers: ASCII art with em-dashes for visual separation
  ```javascript
  // ─── Security + parsing ───────────────────────────────────────────────
  ```
- Inline comments: Sparingly used, only for non-obvious logic (e.g., floating-point rounding in balance calculations)
- JSDoc: Not used; instead rely on clear function names and inline section comments
- TODO/FIXME: Not detected in codebase

## Import Organization

**Order (Backend):**
1. Built-in Node modules (first)
2. Third-party packages (second)
3. Local modules with relative paths (third)

Example from `authController.js`:
```javascript
const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger       = require('../utils/logger');
```

**Order (Frontend):**
1. React and React Native imports (first)
2. Navigation and routing (second)
3. Third-party UI libraries (`@expo/vector-icons`, etc.) (third)
4. Local imports with `@/` alias (last)

Example from `app/_layout.jsx`:
```javascript
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
```

**Path Aliases:**
- Frontend only: `@/` maps to `frontend/` directory
- Configured in `frontend/tsconfig.json` (paths) and implicit in `frontend/metro.config.js`
- All frontend imports use `@/` — never use relative paths

## Error Handling

**Patterns:**
- Backend controllers wrapped in `asyncHandler()` (`utils/asyncHandler.js`) — do NOT write try/catch in controllers
- Controllers throw errors or call `res.status().json()` directly; errors are caught by `asyncHandler` and passed to global `errorHandler` middleware
- Global error handler at `middleware/errorHandler.js` logs 5xx as errors, 4xx as warnings
- Frontend API errors normalized to plain `Error` objects with `.message` string in response interceptor (`services/api.js`)
- Error messages always include user-friendly strings, never expose stack traces to client (except in dev mode via `NODE_ENV` check)

**Error Response Format (Backend):**
```javascript
// Standard error response
{ success: false, message: "Human-readable error message" }

// With dev details (NODE_ENV === 'development')
{ success: false, message: "...", stack: "..." }
```

**Frontend Error Handling:**
- Async operations wrap in try/catch, set local error state, display via `Alert.alert()` or in-screen messaging
- API interceptor handles 401 by wiping auth token, causing redirect to login
- All API responses normalized before reaching components — no axios error objects exposed

## Logging

**Framework:** Custom lightweight logger at `utils/logger.js` (no external dependencies)

**Log Levels & Usage:**
- `logger.info(tag, message, meta?)` — General informational events
- `logger.warn(tag, message, meta?)` — Unexpected but non-fatal conditions
- `logger.error(tag, message, meta?)` — Errors (writes to stderr)
- `logger.debug(tag, message, meta?)` — Verbose logging (silenced in production)
- `logger.http(tag, message, meta?)` — HTTP request/response lines (green output)

**Tags Used (predefined):**
- `SERVER` — startup/shutdown
- `DB` — database operations
- `HTTP` — request/response logging (auto-generated in index.js middleware)
- `AUTH` — authentication events
- `GROUP` — group operations
- `EXPENSE` — expense operations
- `TXN` — personal transactions
- `SETTLE` — settlements
- `BALANCE` — balance calculations
- `DASH` — dashboard
- `BUDGET` — budget operations
- `ERR` — error handler

**Metadata Pattern:**
- Always include operation IDs in metadata: `{ groupId, userId, expenseId }`
- Log before and after operations for audit trail
- Redact passwords in HTTP logging middleware (see `index.js`)

**Example:**
```javascript
logger.info('EXPENSE', `Expense added: ₹${amt} (${category}, ${splitType})`, {
  groupId: group._id,
  expenseId: expense._id,
  payerId,
  addedBy: req.user._id,
});
```

## Comments

**When to Comment:**
- Only for non-obvious algorithmic logic (e.g., balance calculation debt simplification)
- Section headers to separate code blocks (using ASCII dividers)
- Explain the "why" if business logic is non-standard

**JSDoc/TSDoc:**
- Not used in this codebase
- Clear function names and parameter names prioritized over documentation

**Examples:**
```javascript
// From balanceService.js — explains complex algorithm
// Simplified debt list — greedy matching of debtors to creditors

// From frontend dashboard — marks component sections
{/* ── Header ── */}
{/* ── Balance Card ── */}
```

## Function Design

**Size:** Generally under 50 lines; controllers tend toward the longer end (30–40 lines) due to validation logic

**Parameters:**
- Ordered: required parameters first, optional last (though not always strict)
- Destructuring common for object parameters: `const { name, email, password } = req.body`
- Middleware signature: `(req, res, next)` for Express
- Frontend hooks and context functions: minimal parameters, rely on context/hooks for state

**Return Values:**
- Controllers return via `res.json()` or `res.status().json()`
- Helper functions return computed values directly; services return objects with `{ members, debts }` structure
- Frontend async operations update local state rather than returning values directly

## Module Design

**Exports:**
- Backend: `module.exports = { functionName, anotherFunction }`
- Objects for multiple exports: `module.exports = { createGroup, getUserGroups, getGroup, ... }`
- Frontend: `export function ComponentName()` or `export const api = ...`
- Services: `export default api` for singleton services like API client

**Barrel Files:**
- Not used; each file imported individually
- Frontend example: `import api from '@/services/api'` (not from `@/services/index.js`)

**File Organization:**
- One controller per file (one responsibility)
- Models: one schema per file
- Routes: one route family per file (e.g., all group routes in `groups.js`)
- Utilities: one utility per file (logger, asyncHandler, etc.)

## Constants and Configuration

**Frontend Theme:**
- All colors defined in `constants/theme.js` as `PC` object export
- Never hardcode color values; always reference `PC.bg`, `PC.textPrimary`, `PC.positive`, etc.
- Theme keys: `bg`, `bgCard`, `bgCardElevated`, `bgInput`, `border`, `borderLight`, `textPrimary`, `textSecondary`, `textMuted`, `positive`, `negative`, `warning`, `white10`, `white20`, `white05`

**Environment Variables:**
- Backend: `process.env.PORT`, `process.env.JWT_SECRET`, `process.env.JWT_EXPIRES_IN`, `process.env.MONGODB_URI`, `process.env.NODE_ENV`, `process.env.CLIENT_URL`
- Frontend: Runtime-derived via `expo-constants` for API base URL (`Constants.expoConfig.hostUri`)
- All sensitive vars loaded from `.env` (not checked in); use `.env.example` as reference

## Validation

**Backend:**
- Field-level validation first: check required fields, types, lengths
- Range validation: amounts, dates (1 year lookback), percentages
- Business logic validation: ensure users are group members, settle debits
- Return 400 with descriptive message on validation failure

**Frontend:**
- Numeric input: `keyboardType="numeric"`, manual `parseFloat()` validation
- Trim and lowercase email before sending
- Display validation errors via `Alert.alert()` modals

---

*Convention analysis: 2026-03-09*
