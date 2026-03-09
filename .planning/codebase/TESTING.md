# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Runner:**
- Backend: No test framework detected or installed
- Frontend: No test framework detected or installed
- Both use `npm test` or `npm run test` if configured (not present in package.json scripts)

**Current State:**
- No Jest, Vitest, Mocha, or other testing infrastructure
- No test files (`*.test.js`, `*.spec.js`) in source directories
- ESLint present on frontend but no test runner

**Recommended Setup (when needed):**
- Backend: Jest with `@types/jest` for Node.js testing
- Frontend: Jest with React Native/Expo support or Detox for E2E

## Test File Organization

**Would-Be Location Pattern (if tests existed):**
- Backend: Co-located with source — `src/controllers/__tests__/authController.test.js`
- Frontend: Co-located with screens/components — `app/(tabs)/__tests__/index.test.js`

**Naming Convention:**
- Suffix pattern: `.test.js` (not `.spec.js`)
- Test directory: `__tests__/` alongside source files

## Test Structure

**Backend Setup (when implemented):**
```javascript
// Expected pattern from CLAUDE.md constraints:
// Controllers wrapped in asyncHandler — test should verify:
// 1. Happy path: correct response status and data
// 2. Error path: errors thrown and caught by asyncHandler, passed to errorHandler
// 3. Validation failures: 400 status with descriptive message

describe('authController', () => {
  describe('register', () => {
    it('creates a user and returns token', async () => {
      // Test setup: mock User.create
      // Call: await register(req, res)
      // Verify: res.status(201) called with success:true, token, user
    });

    it('rejects duplicate email', async () => {
      // Test setup: User.findOne mocked to return existing user
      // Call: await register(req, res) with duplicate email
      // Verify: res.status(409) called with message about email exists
    });

    it('validates password strength', async () => {
      // Test weak password (< 8 chars, no letters, no numbers)
      // Verify: 400 with message about requirements
    });
  });
});
```

**Frontend Setup (when implemented):**
```javascript
// Expected pattern:
// 1. Render components with mock data/context
// 2. Verify UI displays correctly
// 3. Simulate user interactions (press, scroll, input)
// 4. Verify state updates and async calls

describe('DashboardScreen', () => {
  it('displays loading skeleton while fetching', () => {
    // Mock useAuth to return user
    // Mock api.get to be pending
    // Render DashboardScreen
    // Verify SkeletonBox components visible
  });

  it('displays error state on fetch failure', async () => {
    // Mock api.get to reject
    // Render and wait for error state
    // Verify error icon and retry button visible
  });

  it('opens budget modal on button press', async () => {
    // Render with budget data
    // Find and press "Set a monthly budget" button
    // Verify budgetModalVisible state becomes true, modal visible
  });
});
```

## Mocking

**Backend Mocking Strategy (when implemented):**
- Framework: jest.mock for dependencies
- Mongoose mocks: Mock `User.findOne()`, `User.create()`, `Group.find()`, etc.
- AsyncStorage not applicable to backend
- Example mock:
  ```javascript
  jest.mock('../models/User');
  User.findOne.mockResolvedValue(null); // no user found
  ```

**Frontend Mocking Strategy (when implemented):**
- Framework: jest.mock for API/context/AsyncStorage
- Mock `api.get()` and `api.post()` to return test data:
  ```javascript
  jest.mock('@/services/api');
  api.get.mockResolvedValue({ data: { dashboard: {...} } });
  ```
- Mock `useAuth` hook:
  ```javascript
  jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: mockUser, token: 'test-token', loading: false })
  }));
  ```
- Mock AsyncStorage:
  ```javascript
  jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn(),
  }));
  ```

**What to Mock:**
- External API calls (axios in frontend, database in backend)
- Time-dependent logic (use jest.useFakeTimers())
- Random ID/UUID generation
- Environment-dependent values (NODE_ENV, BASE_URL)

**What NOT to Mock:**
- Business logic (calculation functions like `calculateGroupBalances`)
- Validation logic (pattern tests, range checks)
- Utility functions (logger, asyncHandler behavior)
- Component rendering and interaction (use actual components where possible)

## Fixtures and Factories

**Test Data (would be defined in `__tests__/fixtures/`):**

Backend example:
```javascript
// fixtures/users.js
const mockUser = {
  _id: new ObjectId(),
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashedPassword123',
  walletBalance: 0,
  isVerified: true,
};

const mockGroup = {
  _id: new ObjectId(),
  name: 'Roommates',
  type: 'Roommates',
  adminId: mockUser._id,
  members: [mockUser._id],
};

const mockExpense = {
  _id: new ObjectId(),
  groupId: mockGroup._id,
  amount: 1000,
  payerId: mockUser._id,
  date: new Date(),
  category: 'Food',
  splitType: 'equal',
  splits: [{ userId: mockUser._id, amount: 1000 }],
};
```

Frontend example:
```javascript
// fixtures/dashboard.js
const mockDashboardData = {
  totalToReceive: 500,
  totalOwed: 200,
  totalSpent: { combined: 300 },
  personalIncome: 1000,
};

const mockBudgetData = {
  budget: 5000,
  spent: 2000,
  remaining: 3000,
  month: '2026-03',
  status: 'healthy',
  usagePercentage: 40,
};
```

**Location:** `src/__tests__/fixtures/` for both backend and frontend

## Coverage

**Requirements:** None enforced (no coverage tool configured)

**Recommended targets (when implementing):**
- Backend: 80% statement coverage for controllers and services
- Frontend: 60% coverage for screens and components (UI less critical than logic)
- Critical paths: 100% coverage for auth, balance calculation, expense creation

**View Coverage (when configured):**
```bash
# Backend (Jest)
npm test -- --coverage

# Frontend (Jest)
npm test -- --coverage --collectCoverageFrom="app/**/*.{js,jsx}"
```

## Test Types

**Unit Tests (Backend):**
- Scope: Individual controller functions, service functions
- Approach: Mock database, test request/response handling
- Example: `authController.register()` with various email/password combinations
- Critical areas: Auth (password validation, token generation), balance calculation, validation logic

**Unit Tests (Frontend):**
- Scope: Individual component functions, hooks, utilities
- Approach: Mock API and context, test component rendering and state
- Example: Dashboard screen loads data and displays correctly
- Critical areas: Auth flow (login/logout/restore), balance display, budget calculations

**Integration Tests (Backend):**
- Scope: Complete request flow through middleware → controller → database
- Approach: Use test database, minimal mocking
- Example: POST /api/groups with user authentication, verify group created and user added as member
- Would test: asyncHandler error flow, middleware chaining, database operations

**Integration Tests (Frontend):**
- Scope: Complete user flow (login → dashboard → group creation)
- Approach: Mock API but test navigation and data flow
- Example: User logs in, sees dashboard, navigates to groups, creates group
- Would test: AuthProvider → RootGuard redirect logic, API calls and state sync

**E2E Tests:**
- Tool: Not currently used; would use Detox for React Native
- Scope: Real app on emulator/device, real API calls or stubbed server
- Example: User flow from launch to group expense settlement

## Common Patterns

**Async Testing (when implemented):**
```javascript
// Backend: asyncHandler already catches async errors
it('handles async errors', async () => {
  const req = { body: { email: 'test@example.com', password: 'weak' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  await register(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ success: false })
  );
});

// Frontend: Use async/await with waitFor
it('loads dashboard data', async () => {
  const { getByText } = render(<DashboardScreen />);

  await waitFor(() => {
    expect(getByText('Recent Activity')).toBeTruthy();
  });
});
```

**Error Testing (Backend):**
```javascript
it('returns 400 on validation error', async () => {
  const req = {
    body: { name: '', email: 'test@example.com' },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  await register(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      message: expect.stringContaining('Name')
    })
  );
});

it('catches async errors and passes to errorHandler', async () => {
  User.findOne.mockRejectedValueOnce(new Error('DB error'));
  const req = { body: { email: 'test@example.com', password: 'password123' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  // asyncHandler wraps the function and calls next(error) on rejection
  await register(req, res);

  // Error caught by asyncHandler and passed to errorHandler
});
```

**Frontend Error Testing:**
```javascript
it('displays error when API fails', async () => {
  api.get.mockRejectedValueOnce(new Error('Network error'));
  const { getByText } = render(<DashboardScreen />);

  await waitFor(() => {
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});

it('clears stored auth on 401', async () => {
  api.interceptors.response.handlers[1].reject({
    response: { status: 401 },
  });

  await waitFor(() => {
    expect(removeToken).toHaveBeenCalled();
  });
});
```

## Validation Testing

**Email/Password Validation (Backend):**
```javascript
// Test patterns from authController.js
describe('validation', () => {
  it('rejects invalid email formats', async () => {
    const invalidEmails = ['notanemail', 'user@', '@example.com', 'user @example.com'];
    for (const email of invalidEmails) {
      const res = await register({ body: { name: 'User', email, password: 'Password123' } });
      expect(res.status).toBe(400);
    }
  });

  it('rejects weak passwords', async () => {
    const weakPasswords = ['short1', 'NoNumbers', 'nouppercase1', '12345678'];
    for (const password of weakPasswords) {
      const res = await register({ body: { name: 'User', email: 'test@example.com', password } });
      expect(res.status).toBe(400);
    }
  });
});
```

**Amount Validation (Backend - Expenses):**
```javascript
it('validates expense amounts', async () => {
  // From expenseController.js: amount must be between ₹0.01 and ₹1,00,000
  const invalidAmounts = [-100, 0, 0.001, 100001];

  for (const amount of invalidAmounts) {
    const res = await addExpense({ body: { amount, ... } });
    expect(res.status).toBe(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/₹0.01.*₹1,00,000/)
      })
    );
  }
});
```

## Key Testing Constraints (from CLAUDE.md)

**Backend:**
- Controllers wrapped in `asyncHandler` — errors thrown are automatically caught
- Do NOT add try/catch in controllers; let asyncHandler catch
- Test that errorHandler logs 5xx as errors and 4xx as warnings
- `isMember` middleware loads `req.group` — test that it's attached and used
- Mongoose 9 async pre-save hooks use no `next` parameter — test pre-save hooks verify password hashing

**Frontend:**
- `AuthProvider` and `RootGuard` handle redirects — test that unauthenticated users can't access protected routes
- API interceptor normalizes errors to plain Error objects — test that components never receive axios errors
- `useAuth` must be within AuthProvider — test throws if hook used outside provider
- Metro bundler hostname auto-detection — test BASE_URL construction with mock Constants

---

*Testing analysis: 2026-03-09*
