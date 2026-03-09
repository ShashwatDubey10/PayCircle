# Codebase Concerns

**Analysis Date:** 2026-03-09

## Tech Debt

**Unused morgan dependency:**
- Issue: `morgan` package is listed in `backend/package.json` but never imported or used in the codebase. HTTP logging is fully handled by custom middleware in `backend/src/index.js`.
- Files: `backend/package.json` (line 22), `backend/src/index.js` (does not use it)
- Impact: Adds unnecessary dependency weight, minor security maintenance burden, confusion for future maintainers
- Fix approach: Remove `"morgan": "^1.10.1"` from `backend/package.json` and run `npm install` to clean lockfile

**Manual floating-point arithmetic throughout balance calculations:**
- Issue: Balance and budget calculations repeatedly use `.toFixed(2)` conversions with manual `parseFloat()` calls, risking precision loss and off-by-one errors in debt simplification
- Files: `backend/src/services/balanceService.js` (lines 47, 50-51, 64, 68, 70-71), `backend/src/controllers/budgetController.js` (lines 97, 99-100, 107-109), `backend/src/controllers/dashboardController.js` (lines 52, 63-64)
- Impact: Potential rounding errors accumulate across multiple calculations; edge cases with uneven splits may result in penny-off errors
- Fix approach: Consider using a dedicated decimal library (e.g., `decimal.js`) or refactoring balance logic to work in cents (integers) for intermediate steps, then convert to rupees only for output

**Hardcoded timezone as UTC (no conversion):**
- Issue: All dates are stored and compared in UTC without explicit timezone handling. Frontend and backend do not explicitly convert user dates to UTC before sending to API, risking date interpretation mismatches for users in non-UTC zones
- Files: `backend/src/controllers/dashboardController.js` (lines 11-13), `backend/src/controllers/budgetController.js` (lines 65-67), `backend/src/controllers/expenseController.js` (lines 19-23)
- Impact: Users in +5:30 IST (India) or other non-UTC zones may see expenses recorded on the wrong calendar date if frontend timestamps are naive
- Fix approach: Document that all dates must be ISO-8601 (with timezone offset) before transmission; validate on API layer; explicitly handle IST conversion in frontend datetime pickers

**Greedy debt simplification algorithm is suboptimal:**
- Issue: `backend/src/services/balanceService.js` (lines 57-73) uses a simple greedy sort-and-match approach to simplify debts, which does not guarantee minimal transaction count for all cases
- Files: `backend/src/services/balanceService.js` (lines 56-73)
- Impact: Users may see more payment instructions than mathematically necessary, confusing settlement workflows
- Fix approach: For MVP this is acceptable (most groups are small); upgrade to graph-based debt resolution (e.g., cycle detection) before scaling to large groups or Phase 2

## Known Bugs

**Group membership check is duplicated in getGroup:**
- Symptoms: `backend/src/controllers/groupController.js` getGroup (lines 61-75) checks membership again even though `isMember` middleware already validates it for protected routes
- Files: `backend/src/controllers/groupController.js` (lines 61-75), `backend/src/routes/groups.js` (line 17)
- Trigger: `GET /api/groups/:id` with valid JWT but non-member user
- Workaround: None needed; code works correctly (just redundant)
- Root cause: `getGroup` is called without `isMember` middleware (line 17), so the check must stay, but design is inconsistent with other group routes

**AsyncStorage JSON parsing error silently clears auth:**
- Symptoms: If stored user data is corrupted (non-JSON), `frontend/services/auth.js` getUser (lines 18-24) catches the error and clears storage silently with only a console.error; no user notification
- Files: `frontend/services/auth.js` (lines 15-25)
- Trigger: Corrupted AsyncStorage data from failed previous save or device storage corruption
- Workaround: User will be logged out automatically; no action required
- Impact: Low in practice; silent logout is graceful but diagnostics are unclear

## Security Considerations

**CORS is overly permissive in development:**
- Risk: `backend/src/index.js` (line 20) uses `process.env.CLIENT_URL || '*'` which falls back to `*` (allow all origins) if `CLIENT_URL` is not set
- Files: `backend/src/index.js` (line 20)
- Current mitigation: Likely only an issue in development; production must set `CLIENT_URL` env var
- Recommendations:
  1. Fail explicitly if `CLIENT_URL` is missing in production (`NODE_ENV === 'production'`)
  2. Add validation that `CLIENT_URL` is a valid URL (no file:// etc.)
  3. Document in `.env.example` as required

**Password regex allows weak passwords:**
- Risk: `backend/src/controllers/authController.js` (line 10) regex requires "8+ chars, at least one letter and one digit" but allows patterns like "aaaaaaaa1" (7 a's + 1 digit)
- Files: `backend/src/controllers/authController.js` (line 10)
- Current mitigation: At least one number + letter is enforced; minimum 8 chars
- Recommendations:
  1. Consider adding uppercase + symbol requirement (e.g., `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/`)
  2. Document password policy in API error messages and auth screens
  3. Reject common passwords (top 1000 list) in production

**JWT expiry is 7 days by default:**
- Risk: `backend/src/controllers/authController.js` (line 7) uses `process.env.JWT_EXPIRES_IN || '7d'` which is a long session lifetime for a financial app
- Files: `backend/src/controllers/authController.js` (line 7)
- Current mitigation: Frontend can force logout on app pause; mobile apps may auto-lock
- Recommendations:
  1. Reduce default to `'24h'` or `'7d'` only for "remember me" sessions
  2. Implement refresh token rotation for long-lived sessions
  3. Add `/api/auth/logout` endpoint to explicitly revoke tokens (not yet implemented)

**No rate limiting on authentication endpoints:**
- Risk: `backend/src/routes/auth.js` does not have rate limiting; brute-force attacks on login/register possible
- Files: `backend/src/routes/auth.js`, `backend/src/controllers/authController.js`
- Current mitigation: None
- Recommendations:
  1. Add `express-rate-limit` middleware (e.g., 5 attempts per 15 minutes per IP)
  2. Apply to `/api/auth/login` and `/api/auth/register`
  3. Document rate limit headers in API responses

**No input sanitization for notes/descriptions:**
- Risk: `notes` fields in Expense and Settlement models accept up to 200 chars without sanitization; XSS not possible in API responses (JSON), but potential for injection if notes are rendered as HTML in frontend
- Files: `backend/src/models/Expense.js` (line 16), `backend/src/models/Settlement.js`, `backend/src/controllers/expenseController.js` (line 61)
- Current mitigation: Frontend likely renders as text (not HTML), so low risk
- Recommendations:
  1. Apply `.trim()` on input (already done via `maxlength`)
  2. If frontend ever renders notes as HTML, add DOMPurify or similar sanitizer

**Removed user can still be referenced in expenses:**
- Risk: If a user is deleted from a group, their ID remains in `Expense.splits[].userId` and `Expense.payerId`. Subsequent balance calculations may fail if user is deleted from the User collection entirely
- Files: `backend/src/controllers/groupController.js` (lines 126-144), `backend/src/services/balanceService.js` (lines 40-43)
- Current mitigation: `.populate()` calls in controllers handle missing user refs (returns null)
- Recommendations:
  1. On user deletion, cascade-delete or archive all related expenses (consider implementing)
  2. Add database-level referential integrity constraints (Foreign Key triggers)
  3. For now, document that users should never be deleted while in groups with expenses

## Performance Bottlenecks

**Dashboard and balance endpoints recalculate from scratch every request:**
- Problem: `getDashboard` (backend/src/controllers/dashboardController.js lines 70-77) and `getUserSummary` (backend/src/controllers/balanceController.js lines 21-34) call `calculateGroupBalances()` for EVERY group, even if balances haven't changed
- Files: `backend/src/controllers/dashboardController.js` (lines 70-77), `backend/src/controllers/balanceController.js` (lines 21-34), `backend/src/services/balanceService.js`
- Cause: No caching; every request iterates all expenses and settlements for all user groups
- Impact: Linear time complexity O(groups × expenses × members); will slow down for users in 10+ groups or groups with 100+ expenses
- Improvement path:
  1. Short-term: Cache balance results for 5-10 minutes in Redis or memory
  2. Medium-term: Denormalize balance fields on Group document, update on-write
  3. For now, acceptable for MVP (expected <10 groups/user)

**No database indexes on user-scoped queries:**
- Problem: `PersonalTransaction.find({ userId, date: { $gte, $lte } })` (backend/src/controllers/personalTransactionController.js line 53) exists index on `userId: 1, date: -1` (good), but `Expense.find()` and `Settlement.find()` queries lack compound indexes
- Files: `backend/src/models/Expense.js` (line 23) has `{ groupId: 1, date: -1 }`, `backend/src/models/PersonalTransaction.js` (line 20) has `{ userId: 1, date: -1 }`, but Settlement has none
- Impact: Slow queries on large settlement histories
- Improvement path:
  1. Add index to Settlement: `{ groupId: 1, date: -1 }` and `{ fromUserId: 1 }` or `{ toUserId: 1 }`
  2. Add compound indexes for expense category filters: `{ groupId: 1, category: 1, date: -1 }`

**Frontend API base URL derived at runtime every request:**
- Problem: `frontend/services/api.js` (lines 19-26) creates Axios instance with `BASE_URL` computed once at module load, but if Metro bundler IP changes (e.g., reconnect to WiFi), the instance still uses stale IP
- Files: `frontend/services/api.js` (lines 9-19)
- Cause: Expo Go dynamic IP assignment not re-checked after app launch
- Impact: App breaks if machine LAN IP changes mid-session (rare but happens on network reconnect)
- Improvement path:
  1. Refactor to re-compute `BASE_URL` on each request or on network change detection
  2. Use Expo's `netinfo` hook to listen for network changes and reset Axios baseURL
  3. For now, acceptable for development (low likelihood of IP change during active development)

## Fragile Areas

**Balance algorithm depends on settlement date ordering:**
- Files: `backend/src/services/balanceService.js` (lines 30-38)
- Why fragile: Settlement processing assumes chronological order; if `date` field is manipulated or server clock is incorrect, debt simplification may produce incorrect results
- Safe modification: Always validate `settlement.date` is not in future (done for expenses, not settlements)
- Test coverage: No specific tests for settlement edge cases (overlapping dates, duplicate settlements)

**Mongoose pre-save hook on User password hashing:**
- Files: `backend/src/models/User.js` (lines 43-47)
- Why fragile: Pre-save hook silently hashes password only if `isModified('password')`. If schema changes or password is set via direct update query, hashing is skipped
- Safe modification: Only use `await user.save()` after modifying password; never use `User.updateOne()` directly
- Test coverage: No tests for password hashing behavior

**Frontend AuthContext relies on successful `/api/auth/me` on app launch:**
- Files: `frontend/context/AuthContext.jsx` (lines 15-32)
- Why fragile: If backend is unreachable on startup, `restoreSession()` silently clears auth (lines 25-27) without retry logic; user is logged out
- Safe modification: Wrap session restore in try-catch with exponential backoff retry; queue requests until session is confirmed
- Test coverage: No tests for offline/network-error scenarios

**Expense split calculation uses floating-point rounding:**
- Files: `backend/src/controllers/expenseController.js` (lines 34-57)
- Why fragile: Equal splits distribute via `share * (count - 1)` then give remainder to last member (lines 36-41); if amounts don't sum perfectly, minor discrepancies occur
- Safe modification: Round each intermediate split, then adjust last split to make total match
- Test coverage: No tests for equal split totals

## Scaling Limits

**No pagination on list endpoints:**
- Current capacity: MongoDB queries return all results (Expenses, Settlements, Transactions)
- Limit: At 10,000+ expenses per group, response size and query time become prohibitive
- Scaling path:
  1. Add `limit` and `offset` query parameters to all list endpoints
  2. Implement cursor-based pagination for better performance
  3. Return total count and `hasMore` flag

**No query result caching:**
- Current capacity: Every request hits database; no caching layer
- Limit: With 1000+ users, simultaneous requests to `/api/users/me/dashboard` create load spikes
- Scaling path:
  1. Add Redis caching layer (5-10 min TTL for balances)
  2. Implement cache invalidation on expense/settlement POST
  3. Use ETag or If-Modified-Since headers for conditional responses

**No database sharding or read replicas:**
- Current capacity: Single MongoDB Atlas instance
- Limit: Horizontal scaling requires sharding strategy (e.g., by `groupId` or `userId`)
- Scaling path: Defer to Phase 2; for now acceptable at <10K users

## Dependencies at Risk

**jsonwebtoken 9.0.3 is pre-1.0:**
- Risk: Breaking changes possible in future 9.x versions; no major version guarantee
- Impact: Auth breaks if upstream changes JWT interface
- Migration plan: Pin to exact version in `backend/package.json` (`"jsonwebtoken": "9.0.3"` not `^9.0.3`); test before updating

**mongoose 9.2.2 is bleeding edge:**
- Risk: Very new version; limited production track record; Mongoose 8.x is more stable
- Impact: Unexpected schema behavior, memory leaks, or breaking changes in 9.x
- Migration plan: Consider pinning to `8.x` for stability; if staying on 9.x, monitor GitHub issues closely and test major.minor version updates before deploying

**expo 54 SDK may diverge from upstream React Native:**
- Risk: Expo SDK lags behind React Native; newer native APIs unavailable until Expo SDK updates
- Impact: UI features may not work as expected; troubleshooting is harder
- Migration plan: For now acceptable; track Expo release notes for SDK 55+; plan upgrade path

## Missing Critical Features

**No expense receipts or image attachments:**
- Problem: Users cannot attach receipts; makes auditing and dispute resolution impossible
- Blocks: Phase 2 features (expense categorization, tax reports)
- Scope: Out of MVP but should be planned

**No push notifications:**
- Problem: Users are not notified of new expenses, settlements, or group changes; must manually check app
- Blocks: User engagement, reminders for pending settlements
- Scope: Phase 2; low priority for MVP

**No expense export (CSV/PDF):**
- Problem: Users cannot export transaction history for personal records or accounting
- Blocks: Tax reporting, record-keeping for financial audits
- Scope: Phase 3 (docs priority in feature blueprint)

**No offline mode:**
- Problem: App requires live network connection; cannot view cached data or queue transactions offline
- Blocks: Users on flaky networks; rural areas with spotty coverage
- Scope: Phase 2; acceptable for MVP (college network is usually stable)

## Test Coverage Gaps

**Authentication and authorization untested:**
- What's not tested: Login/register flows, JWT validation, password hashing, role-based access (admin vs member)
- Files: `backend/src/controllers/authController.js`, `backend/src/middleware/auth.js`, `backend/src/middleware/groupAuth.js`
- Risk: Regression in auth could expose user data or allow unauthorized access
- Priority: **High** — write integration tests for:
  - Register with valid/invalid emails and passwords
  - Login with wrong password
  - Token expiry and refresh
  - Non-admin cannot add/remove members
  - Non-member cannot view group expenses

**Balance calculation edge cases untested:**
- What's not tested: Zero balances, fractional rupees, large groups (10+ members), settlements that cancel debts
- Files: `backend/src/services/balanceService.js`
- Risk: Undetected rounding errors in debt simplification
- Priority: **High** — write unit tests for:
  - Equal split with 3, 5, 7 members (test rounding)
  - Exact splits that don't sum to total (should reject)
  - Settlement that zeros out a debt
  - Large amounts (₹1,00,000) with small remainders

**Expense creation and split validation untested:**
- What's not tested: Valid/invalid amounts, date boundaries (future/past), payer not member, split sum != amount
- Files: `backend/src/controllers/expenseController.js`
- Risk: Invalid data stored; balance calculations based on wrong amounts
- Priority: **High** — write tests for all validation checks (lines 12-57)

**Frontend API error handling untested:**
- What's not tested: Network errors, timeout, 401 unauthorized, malformed responses
- Files: `frontend/services/api.js`, `frontend/context/AuthContext.jsx`
- Risk: App crashes on network errors; user sees no feedback
- Priority: **Medium** — add error boundary and retry logic tests

**No end-to-end tests:**
- What's not tested: Full workflows like "create group → add member → add expense → view balance → settle"
- Risk: Regressions in integration between frontend and backend
- Priority: **Medium** — set up Cypress or Detox for E2E tests in Phase 2

---

*Concerns audit: 2026-03-09*
