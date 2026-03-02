# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Access Rules

- **Never read or modify `.env` files.** Use `.env.example` files to understand what environment variables are required.
- `.env.example` files are the canonical reference for environment variable keys.

## Dev Commands

**Backend** (run from `backend/`):
```bash
npm run dev      # nodemon — auto-restarts on file changes
npm start        # production (node directly)
```

**Frontend** (run from `frontend/`):
```bash
npx expo start   # starts Metro bundler; scan QR code in Expo Go on device
```

> `expo run:android` / `expo run:ios` require the Android SDK / Xcode and are not used for development — use Expo Go instead.

## Architecture Overview

This is a **monorepo** with two independent packages:

```
PayCircle/
├── backend/     # Express 5 + MongoDB Atlas API
└── frontend/    # React Native (Expo SDK 54) app
```

### Backend

**Request lifecycle:**
```
Request → express.json() → HTTP logger (index.js) → protect (JWT auth)
        → isMember (group routes only, loads req.group) → controller → asyncHandler catch → errorHandler
```

- Every controller is wrapped in `asyncHandler` (`utils/asyncHandler.js`) — do not add try/catch in controllers; just `throw` or call `next(err)`.
- `protect` middleware (`middleware/auth.js`) verifies JWT and attaches the full user object (minus password) to `req.user`.
- `isMember` middleware (`middleware/groupAuth.js`) verifies group membership and attaches the Group document to `req.group`. Group routes that need the group should use `isMember`, not fetch it themselves.
- Logging uses the custom logger at `utils/logger.js`. Call it as `logger.info(tag, message, metaObject?)`. Tags used: `SERVER`, `DB`, `HTTP`, `AUTH`, `GROUP`, `EXPENSE`, `TXN`, `SETTLE`, `BALANCE`, `DASH`, `BUDGET`, `ERR`. `debug` calls are silenced in production.

**Routes are mounted at:**
- `POST/GET /api/auth/...` — auth routes
- `POST/GET/DELETE /api/groups/...` — groups, members, expenses, balances, settlements
- `GET/POST/DELETE /api/users/me/...` — dashboard, budget, personal transactions, balance summary

**Balance algorithm** (`services/balanceService.js`):
Computes `credit[userId]` (paid) and `debit[userId]` (owed share) from all group expenses and settlements, then runs a greedy debt-simplification pass to produce a minimal `debts` list. This is the single source of truth for all balance data — controllers call `calculateGroupBalances(groupId)`.

### Frontend

**Navigation structure** (expo-router file-based):
```
app/
├── _layout.jsx          # Root: wraps everything in AuthProvider + RootGuard
├── auth/login.jsx
├── auth/register.jsx
├── (tabs)/
│   ├── _layout.jsx      # Bottom tab bar (Dashboard, Groups, Transactions, Profile)
│   ├── index.jsx        # Dashboard
│   ├── groups.jsx       # Groups list + settlements tab
│   ├── transactions.jsx # Personal transactions
│   └── profile.jsx
└── groups/[id].jsx      # Group detail screen
```

**Auth flow:**
`AuthContext` (`context/AuthContext.jsx`) is the single source of auth state (`user`, `token`, `loading`). On app launch it restores the session by calling `GET /api/auth/me` with the stored JWT. `RootGuard` (inside `app/_layout.jsx`) watches `user`/`loading` and redirects between `/(tabs)` and `/auth/login` automatically — screens do not handle redirects themselves.

**API layer:**
- `services/api.js` — Axios instance. `BASE_URL` is derived dynamically at runtime from `expo-constants`'s `hostUri` (the Metro bundler host IP), so it always matches the dev machine's current LAN IP without manual updates.
- `services/auth.js` — AsyncStorage helpers for persisting the JWT and user object.
- All API errors are normalized to plain `Error` objects with a `.message` string before reaching components.

**Path alias:** `@/` maps to `frontend/` (configured in `tsconfig.json` paths + `metro.config.js`). All internal imports use `@/`.

**Theme:** All UI colors come from `constants/theme.js` as the `PC` object (e.g. `PC.bg`, `PC.positive`, `PC.negative`). Never hardcode color values — always use a `PC` token.

## Key Conventions

- **All source files are `.jsx`/`.js`** — no `.tsx`/`.ts`. TypeScript is present only in `tsconfig.json` for path resolution.
- **Currency is INR (₹) throughout** — hardcoded, no i18n layer.
- **Group expenses are always group-scoped** (`groupId` required). Personal transactions are user-scoped (no `groupId`). The dashboard aggregates both.
- **Mongoose 9 async pre-save hooks** must not accept a `next` parameter — they are promise-based. Use `async function() { ... }` with no arguments; return early with `return` instead of `return next()`.
- The `morgan` package is in `backend/package.json` but is no longer used — HTTP logging is handled by the custom middleware in `index.js`.
