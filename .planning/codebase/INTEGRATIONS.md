# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**Payment & Settlement (Not Implemented):**
- Stripe - Not integrated; mentioned in MVP but deferred to Phase 3
- UPI/PhonePe - Not integrated; deferred to Phase 3
- Bank transfers - Not implemented; settlement is manual for MVP

**Email (Not Implemented):**
- SendGrid / Nodemailer - Not integrated; no email notifications in MVP

**SMS (Not Implemented):**
- Twilio - Not integrated; no SMS notifications in MVP

## Data Storage

**Databases:**
- MongoDB Atlas (cloud)
  - Connection: `MONGO_URI` in `backend/.env`
  - Client: Mongoose 9.2.2 ODM (`backend/src/config/db.js`)
  - Connection lifecycle:
    - Initial connect on app startup (`connectDB()`)
    - Auto-reconnect on disconnection with logger warnings
    - Error logging via custom logger (`backend/src/utils/logger.js`)
  - Models stored in `backend/src/models/`:
    - User.js - User accounts with password hash (bcryptjs)
    - Group.js - Group definitions
    - Expense.js - Group expenses with splits
    - PersonalTransaction.js - User income/expense transactions
    - Settlement.js - Manual settlement records
    - Budget.js - Monthly budget tracking
    - Transaction.js - Legacy model (may be deprecated)

**File Storage:**
- Local filesystem only (avatar/image URLs are strings, no upload service)
- No S3, Cloudinary, or Firebase Storage integration

**Caching:**
- None; all data queries hit MongoDB directly
- AsyncStorage on frontend for JWT/user object persistence only (`frontend/services/auth.js`)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation:
    - User registers with email/password → password hashed with bcryptjs (`backend/src/models/User.js`)
    - Login returns JWT signed with `JWT_SECRET` (`backend/src/controllers/authController.js`)
    - JWT stored in AsyncStorage on frontend (`frontend/services/auth.js`)
    - JWT attached to all API requests via Axios interceptor (`frontend/services/api.js`)
    - Backend validates JWT in `protect` middleware (`backend/src/middleware/auth.js`)
  - Token expiry: Configurable via `JWT_EXPIRES_IN` env var (default "7d")
  - On 401 response, frontend clears JWT and redirects to login (`frontend/services/api.js`)

**OAuth (Not Implemented):**
- Google/Apple/Facebook OAuth - Not integrated; email/password only for MVP

## Monitoring & Observability

**Error Tracking:**
- None; no Sentry, Rollbar, or Datadog integration

**Logs:**
- Custom logger at `backend/src/utils/logger.js`
  - Methods: `logger.info()`, `logger.debug()`, `logger.warn()`, `logger.error()`
  - Tags used: `SERVER`, `DB`, `HTTP`, `AUTH`, `GROUP`, `EXPENSE`, `TXN`, `SETTLE`, `BALANCE`, `DASH`, `BUDGET`, `ERR`
  - Debug logs silenced in production (NODE_ENV = "production")
  - HTTP request/response logging via middleware in `backend/src/index.js`:
    - Logs method, URL, response status, timing
    - Redacts password fields before logging request body
    - Logs IP address and errors

**Frontend Logging:**
- `console.error()` only in specific recovery paths (`frontend/services/auth.js`)

## CI/CD & Deployment

**Hosting:**
- Backend: Not deployed (development only; needs configuration for Railway/Heroku/AWS)
- Frontend: Not distributed (development via Expo Go only; could use Expo EAS for App Store/Play Store)

**CI Pipeline:**
- None configured; no GitHub Actions, CircleCI, or GitLab CI

**Environment Management:**
- Backend: `.env` file (git-ignored, must be manually created on each environment)
- Frontend: Dynamic IP detection from Expo Metro bundler (no manual config needed)

## Webhooks & Callbacks

**Incoming:**
- None; no webhook endpoints for external services

**Outgoing:**
- None; no outbound webhooks to payment providers or notification services

## Environment Configuration

**Required env vars (Backend):**
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/?appName=Cluster0
PORT=5000
JWT_SECRET=<32-byte-hex-string>
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Secrets location:**
- Backend: `.env` file in `backend/` directory (git-ignored via `.gitignore`)
- Frontend: No secrets stored; JWT persisted to device AsyncStorage
- Never commit `.env` files; use `.env.example` as template

## Data Flow & API Integration

**Frontend → Backend:**
- Axios instance at `frontend/services/api.js`:
  - Base URL: Dynamically determined from Expo Metro bundler IP + `:5000`
  - Request interceptor: Attaches JWT from AsyncStorage as `Authorization: Bearer {token}`
  - Response interceptor: Normalizes errors to plain `Error` objects; on 401, clears JWT and redirects
  - Timeout: 10 seconds
  - Content-Type: application/json

**Backend → MongoDB:**
- Mongoose connection at `backend/src/config/db.js`:
  - Connects on startup
  - Handles disconnect/reconnect events with logging
  - All models use Mongoose schemas with validation

**API Endpoints:**
- Auth: `POST/GET /api/auth/register`, `/login`, `/me`
- Groups: `POST/GET/DELETE /api/groups`, `GET/DELETE /api/groups/:id/members/:userId`
- Expenses: `POST/GET /api/groups/:id/expenses`
- Balances: `GET /api/groups/:id/balances`, `GET /api/users/me/summary`
- Settlements: `POST/GET /api/groups/:id/settlements`
- Personal Transactions: `POST/GET/DELETE /api/users/me/transactions`
- Dashboard: `GET /api/users/me/dashboard`
- Budget: `POST/GET /api/users/me/budget`

---

*Integration audit: 2026-03-09*
