# PayCircle — Frontend Integration Plan

**Goal:** Connect all frontend screens to the backend API, replacing mock data with real data.
**Stack:** React Native (Expo) + Expo Router · Node.js/Express backend · MongoDB Atlas
**Base URL:** `http://<your-local-ip>:5000` (dev) · All endpoints prefixed with `/api`

---

## Phase 0: TS → JS Migration ✅ DONE

All `.ts` / `.tsx` files converted to `.js` / `.jsx`. Type annotations removed. `typedRoutes` experiment removed from `app.json`.

---

## Phase 1: API Infrastructure ✅ DONE

**Files to create:**
- `frontend/services/api.js` — axios instance with base URL + auth interceptor
- `frontend/services/auth.js` — token save/load/clear helpers (AsyncStorage)

**Steps:**
1. Install dependencies:
   ```
   npx expo install axios @react-native-async-storage/async-storage
   ```
2. Create `services/api.js`:
   - Axios instance with `baseURL`
   - Request interceptor: attach `Authorization: Bearer <token>` from AsyncStorage
   - Response interceptor: on 401, clear token + redirect to login
3. Create `services/auth.js`:
   - `saveToken(token)` → AsyncStorage
   - `getToken()` → AsyncStorage
   - `removeToken()` → AsyncStorage

**Relevant backend routes:** All routes use JWT from `Authorization` header.

---

## Phase 2: Auth Context ✅ DONE

**File to create:** `frontend/context/AuthContext.jsx`

**State:** `{ user, token, loading }`
**Methods:**
- `login(email, password)` → POST `/api/auth/login` → save token → set user
- `register(name, email, password)` → POST `/api/auth/register` → save token → set user
- `logout()` → remove token → clear user state → redirect to `/auth/login`
- On mount: read token from AsyncStorage → GET `/api/auth/me` → restore session

**Steps:**
1. Create `AuthContext` with `createContext`
2. `AuthProvider` wraps app, manages state
3. Update `app/_layout.jsx`:
   - Wrap everything in `<AuthProvider>`
   - Add route guard: if `!token && !loading` → redirect to `/auth/login`
   - If `token && !loading` → redirect to `/(tabs)`

---

## Phase 3: Login Screen ✅ DONE

**File:** `app/auth/login.jsx`

**Changes:**
1. Import `useAuth` from `AuthContext`
2. `handleLogin`:
   - Call `auth.login(email, password)`
   - Show loading spinner on button
   - On error: display error message below form (e.g. "Invalid email or password")
   - On success: `AuthContext` handles redirect to `/(tabs)`
3. Add `loading` state to disable button + show activity indicator
4. Add `error` state to show red error message

**Backend route:** `POST /api/auth/login` → `{ token, user }`

---

## Phase 4: Register Screen ✅ DONE

**File:** `app/auth/register.jsx`

**Changes:**
1. Import `useAuth` from `AuthContext`
2. `handleRegister`:
   - Validate: name not empty, email valid format, passwords match, password ≥ 8 chars
   - Call `auth.register(name, email, password)`
   - Show loading/error states (same pattern as login)
3. Add inline validation error messages below each input

**Backend route:** `POST /api/auth/register` → `{ token, user }`

---

## Phase 5: Dashboard Screen ✅ DONE

**File:** `app/(tabs)/index.jsx`

**Replace mock data with:**
- `GET /api/users/me/dashboard` → `{ totalBalance, owedToYou, youOwe, monthlySpent, monthlyEarned, recentTransactions[] }`
- `GET /api/users/me/budget` → `{ month, amount }` (budget limit set by user)

**Changes:**
1. Add `useEffect` on mount → fetch dashboard + budget
2. Show loading skeleton while fetching (placeholder cards)
3. Replace `USER.name` with `auth.user.name` from AuthContext
4. Replace `BALANCE`, `BUDGET`, `QUICK_STATS`, `TRANSACTIONS` with API data
5. "See all" button on Recent Activity → navigate to Transactions tab

**New backend route needed:** `GET /api/users/me/dashboard`
Returns combined summary: group balances + personal transaction totals + recent activity.

---

## Phase 6: Groups Screen ✅ DONE

**File:** `app/(tabs)/groups.jsx`

**Replace mock data with:**
- `GET /api/groups` → list of user's groups
- For each group: `GET /api/groups/:id/balances` → per-group balance for logged-in user
- `GET /api/groups/:id/settlements` → settlements tab data

**Changes:**
1. Fetch groups on mount, enrich with balance data
2. Summary pills (owed to you / you owe) computed from real balance data
3. Group card `onPress` → navigate to group detail screen (Phase 6b)
4. "+" button → open **Add Group modal** (bottom sheet):
   - Fields: Group Name, Type (Roommates / Trip / Mess / Misc)
   - Submit → `POST /api/groups` → refresh list
5. Settlements tab: fetch from `GET /api/groups/:id/settlements` for all groups

**New screens to add (Phase 6b):**
- `app/groups/[id].jsx` — Group detail: members, expenses, add expense button
- `app/groups/add-expense.jsx` — Add expense form (amount, payer, split type, category)

---

## Phase 7: Transactions Screen ✅ DONE

**File:** `app/(tabs)/transactions.jsx`

**Replace mock data with:**
- `GET /api/users/me/transactions` → personal transactions list
- Supports query params: `?type=income|expense` for filtering

**Changes:**
1. Fetch on mount, refetch when filter tab changes
2. Summary card (income / expense / net) computed from fetched data
3. Group by date client-side (format date into month groups)
4. "Add Transaction" button → open **Add Transaction modal**:
   - Fields: Type (income/expense), Amount, Category, Notes, Date
   - Submit → `POST /api/users/me/transactions` → refresh list
5. Long-press on a transaction → show delete confirmation → `DELETE /api/users/me/transactions/:id`

---

## Phase 8: Profile Screen ✅ DONE

**File:** `app/(tabs)/profile.jsx`

**Replace mock data with:**
- `GET /api/auth/me` → `{ name, email, phone, createdAt }`
- Stats (groups count, transactions count) from dashboard API

**Changes:**
1. Load user from `auth.user` in AuthContext (already fetched on login)
2. Compute `joinedDate` from `user.createdAt`
3. Stats (groups, transactions, totalSaved) from dashboard endpoint
4. "Sign Out" → call `auth.logout()` → clears token → navigates to `/auth/login`
5. "Edit Profile" → navigate to `app/profile/edit.jsx` (Phase 8b, optional)

---

## Phase 9: Backend Routes Verification

Cross-check that these backend routes are implemented before integrating each phase:

| Route | Status | Phase |
|-------|--------|-------|
| `POST /api/auth/register` | ✅ Done | Phase 3-4 |
| `POST /api/auth/login` | ✅ Done | Phase 3 |
| `GET /api/auth/me` | ✅ Done | Phase 2, 8 |
| `POST /api/groups` | ❓ Check | Phase 6 |
| `GET /api/groups` | ❓ Check | Phase 6 |
| `GET /api/groups/:id` | ❓ Check | Phase 6b |
| `GET /api/groups/:id/balances` | ❓ Check | Phase 6 |
| `GET /api/groups/:id/settlements` | ❓ Check | Phase 6 |
| `POST /api/groups/:id/expenses` | ❓ Check | Phase 6b |
| `GET /api/groups/:id/expenses` | ❓ Check | Phase 6b |
| `POST /api/users/me/transactions` | ❓ Check | Phase 7 |
| `GET /api/users/me/transactions` | ❓ Check | Phase 7 |
| `DELETE /api/users/me/transactions/:id` | ❓ Check | Phase 7 |
| `GET /api/users/me/dashboard` | ❌ Needs build | Phase 5 |
| `GET /api/users/me/budget` | ❌ Needs build | Phase 5 |
| `POST /api/users/me/budget` | ❌ Needs build | Phase 5 |
| `GET /api/users/me/summary` | ❌ Needs build | Phase 5 |

---

## New Files to Create (Summary)

```
frontend/
├── services/
│   ├── api.js              # Axios instance + interceptors
│   └── auth.js             # Token helpers (AsyncStorage)
├── context/
│   └── AuthContext.jsx     # Global auth state + methods
└── app/
    ├── groups/
    │   ├── [id].jsx        # Group detail screen
    │   └── add-expense.jsx # Add expense form
    └── profile/
        └── edit.jsx        # Edit profile (optional)
```

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 9 (backend check)
→ Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Each phase should be fully working (connected + tested on device/emulator) before moving to the next.

---

## Notes

- **Error handling:** Every API call needs a try/catch. Show user-friendly error messages, never raw error objects.
- **Loading states:** Every screen that fetches data needs a loading indicator (ActivityIndicator or skeleton).
- **Token expiry:** The backend JWT expires after a set time. The 401 interceptor in `api.js` handles this automatically.
- **Currency:** INR is hardcoded for MVP — no currency switching needed.
- **Base URL:** Set `BASE_URL` in `services/api.js` to your backend's IP:port. Use your machine's LAN IP (not `localhost`) when testing on a physical device.
