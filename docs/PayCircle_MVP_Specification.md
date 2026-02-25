# PayCircle - MVP Product Specification

**Minimum Viable Product - Core Features Only**  
**Version:** MVP 1.0  
**Date:** February 2026  
**Scope:** 12 Features Only  
**Target Timeline:** 6-8 Weeks  

---

## Executive Summary

PayCircle MVP is a focused expense management application designed exclusively for college students sharing living expenses. This MVP specification strictly defines the 12 core features required for a functional group expense tracker.

### MVP Philosophy

- **Focus:** Solve one problem extremely well - split and track shared expenses
- **Scope:** 12 features only, no scope creep permitted
- **Timeline:** Achievable in 6-8 weeks with focused development
- **Complexity:** Simple, intuitive, no learning curve
- **Quality:** Every feature fully functional, tested, and polished

### What's Included in MVP

- User authentication and account management
- Group creation and member management
- Basic expense entry with two split types
- Automatic balance calculation
- Manual settlement tracking
- Simple expense history
- Basic dashboard with essential metrics
- Monthly budget tracking

---

## MVP Feature List (Complete)

These 12 features constitute the complete MVP. Nothing beyond this list should be implemented in the initial version.

| # | Feature | Category | Priority |
|---|---------|----------|----------|
| 1 | User registration and login | Authentication | P0 |
| 2 | Create and join groups | Group Management | P0 |
| 3 | Add and manage group members | Group Management | P0 |
| 4 | Add expense (amount, payer, date, notes, category) | Expense Entry | P0 |
| 5 | Equal and exact amount split options | Expense Entry | P0 |
| 6 | Automatic real-time balance calculation | Balance Engine | P0 |
| 7 | View 'You owe / You are owed' summary | Balance Display | P0 |
| 8 | Group balance overview (who owes whom) | Balance Display | P0 |
| 9 | Record settlements (manual settle-up) | Settlement | P0 |
| 10 | Expense history with basic filtering | History | P0 |
| 11 | Basic personal dashboard | Dashboard | P0 |
| 12 | Monthly budget setting with usage indicator | Budget | P0 |

---

## 1. User Registration and Login

### 1.1 User Registration

**Required Fields:**
- Full Name (text, 2-50 characters)
- Email Address (unique, validated format)
- Password (minimum 8 characters, alphanumeric required)
- Confirm Password (must match)

**Validation Rules:**
- Email must be unique in the system
- Password must contain at least one letter and one number
- All fields are required (no optional fields)
- Email format validation (standard regex)

**User Flow:**
1. User taps 'Sign Up' on welcome screen
2. Fills registration form
3. System validates all inputs
4. On success: Account created, automatically logged in, redirected to dashboard
5. On error: Show specific error message (email taken, weak password, etc.)

### 1.2 User Login

**Required Fields:**
- Email Address
- Password

**Authentication:**
- JWT-based authentication (access token only for MVP)
- Token expires after 7 days
- Password stored as bcrypt hash (10 salt rounds)

**User Flow:**
1. User enters email and password
2. System verifies credentials
3. On success: Generate JWT token, store locally, redirect to dashboard
4. On failure: Show 'Invalid email or password' error

**Out of Scope for MVP:**
- Forgot password functionality
- Email verification
- Social login (Google, Facebook)
- Profile picture upload
- Two-factor authentication

---

## 2. Create and Join Groups

### 2.1 Create Group

**Required Fields:**
- Group Name (text, 3-50 characters)
- Group Type (dropdown: Roommates, Trip, Mess, Miscellaneous)

**Default Settings:**
- Creator is automatically set as Admin
- Currency: INR (Indian Rupees) - hardcoded for MVP
- Group is immediately active after creation

**User Flow:**
1. User taps 'Create Group' button
2. Fills group name and selects type
3. Taps 'Create'
4. Group is created with user as the only member (Admin)
5. User is redirected to group detail page

### 2.2 Join Group

**Join Mechanism:**
- Users can only be added to groups by existing members (no public join)
- Member addition is covered in Feature #3 (Manage Group Members)

**Out of Scope for MVP:**
- Group invite links
- QR code invites
- Group search functionality
- Group settings (edit name, change type)
- Multiple currency support
- Group description or cover image

---

## 3. Add and Manage Group Members

### 3.1 Add Members

**Add Member Process:**
- Admin searches for user by email address
- System shows matching user (if registered)
- Admin taps 'Add to Group'
- User is immediately added as 'Member' role

**Member Roles:**

| Role | Permissions |
|------|-------------|
| Admin | Add/remove members, delete group, view/add expenses, settle debts |
| Member | View/add expenses, settle debts, view members |

### 3.2 View Members

**Member List Display:**
- Show all group members in a list
- Display: Name, Email, Role (Admin/Member)
- Simple list view, no fancy UI

### 3.3 Remove Members (Admin Only)

**Remove Process:**
- Admin can remove any member (except themselves if they're the last admin)
- Confirmation dialog: "Are you sure you want to remove [Name]?"
- Upon removal: Member loses access to group, all their expense history remains

**Out of Scope for MVP:**
- Friend requests or friend network
- Member profile pages
- Transfer admin rights
- Leave group functionality (for non-admins)
- Member activity tracking

---

## 4. Add Expense

### 4.1 Expense Form

**Required Fields:**
- Amount (numeric, > 0, up to 2 decimal places)
- Payer (dropdown: any group member)
- Date (date picker, default: today)
- Category (dropdown: Food, Travel, Utilities, Miscellaneous)

**Optional Fields:**
- Notes (text, up to 200 characters)

**User Flow:**
1. User taps 'Add Expense' button on group page
2. Fills expense form
3. Selects split type (covered in Feature #5)
4. Taps 'Save Expense'
5. Expense is added, balances updated automatically
6. User sees success message and returns to group page

**Validation Rules:**
- Amount must be greater than 0
- Amount cannot exceed ₹100,000 (sanity check)
- Date cannot be more than 1 year in the past
- Date cannot be in the future
- All required fields must be filled

**Out of Scope for MVP:**
- Receipt image upload
- Multi-payer support
- Exclude members from expense
- Edit or delete expense after creation
- Duplicate expense functionality
- Sub-categories

---

## 5. Equal and Exact Amount Split Options

### 5.1 Equal Split

**How It Works:**
- Total amount is divided equally among all group members
- Formula: Share = Total Amount ÷ Number of Members
- If division results in fractions, round to 2 decimal places

**Example:**
- Total: ₹300
- Members: A, B, C (3 members)
- Each pays: ₹100

**User Interface:**
- Default split type (pre-selected)
- No additional input required from user
- Show calculated per-person amount as preview

### 5.2 Exact Amount Split

**How It Works:**
- User specifies exact amount each member should pay
- Sum of all individual amounts must equal total expense amount
- System validates that total matches

**Example:**
- Total: ₹300
- Member A: ₹150
- Member B: ₹100
- Member C: ₹50
- Sum: ₹300 ✓ (Valid)

**User Interface:**
- Show input field for each group member
- Display running total as user enters amounts
- Show error if total doesn't match: "Total must equal ₹300"
- Disable 'Save' button until totals match

**Validation Rules:**
- Sum of all shares must exactly equal total amount
- Each share must be ≥ 0 (can be 0 to exclude someone)
- At least one member must have share > 0

**Out of Scope for MVP:**
- Percentage-based split
- Share-based split (weighted shares)
- Custom split by ratio
- Save split templates

---

## 6. Automatic Real-time Balance Calculation

### 6.1 Balance Calculation Logic

**How Balances Are Calculated:**

For each user in a group:
1. Total Paid = Sum of all expenses where user is the payer
2. Total Owed = Sum of user's share in all group expenses
3. Net Balance = Total Paid - Total Owed

**Balance Types:**
- **Positive Balance:** User has paid more than their share (others owe them)
- **Negative Balance:** User has paid less than their share (they owe others)
- **Zero Balance:** User is settled up

**Example Scenario:**

Group: A, B, C
- Expense 1: ₹300 paid by A, split equally (₹100 each)
- Expense 2: ₹150 paid by B, split equally (₹50 each)

| User | Total Paid | Total Owed | Net Balance |
|------|------------|------------|-------------|
| A | ₹300 | ₹150 | +₹150 (owed to A) |
| B | ₹150 | ₹150 | ₹0 (settled) |
| C | ₹0 | ₹150 | -₹150 (C owes) |

### 6.2 Real-time Updates

**When Balances Update:**
- Immediately after new expense is added
- Immediately after settlement is recorded
- No manual refresh required

**Technical Implementation:**
- Recalculate balances on every expense add/settlement
- Store calculated balances in database for quick retrieval
- Update UI immediately after calculation

**Out of Scope for MVP:**
- Balance optimization algorithm
- Suggested optimal settlement plan
- Transaction minimization
- Balance history or trends

---

## 7. View 'You Owe / You Are Owed' Summary

### 7.1 Personal Balance Summary

**Summary Cards:**

Display two summary cards on user's dashboard:

**Card 1: You Owe**
- Show total amount user owes across all groups
- Color: Red background
- Format: ₹XXX.XX
- Click to see breakdown by group

**Card 2: You Are Owed**
- Show total amount others owe to user across all groups
- Color: Green background
- Format: ₹XXX.XX
- Click to see breakdown by group

### 7.2 Breakdown View

**Group-wise Breakdown:**

When user taps on summary card, show list:
- Group name
- Amount owed or to be received
- Tap group to go to group balance page

**Example Display:**
```
You Owe: ₹450
  - Room 401: ₹200
  - Trip to Goa: ₹250

You Are Owed: ₹300
  - Mess Group: ₹300
```

**Out of Scope for MVP:**
- Person-wise breakdown (show exact who owes whom)
- Payment history
- Overdue indicators
- Settlement suggestions

---

## 8. Group Balance Overview

### 8.1 Group Balance Page

**What It Shows:**
- List of all group members
- Each member's net balance in the group
- Color coding: Green (owed), Red (owes), Gray (settled)

**Display Format:**

| Member Name | Net Balance | Status |
|-------------|-------------|--------|
| Alice | +₹150 | Gets back ₹150 |
| Bob | ₹0 | Settled up |
| Charlie | -₹150 | Owes ₹150 |

### 8.2 Simplified Debts (Manual View)

**Who Owes Whom:**

Below the member list, show simplified debt relationships:
- Only show pairwise debts where amount > 0
- Format: "Charlie owes Alice ₹150"
- Simple list, no optimization

**Calculation Logic:**

For each person with negative balance:
1. Find all people with positive balance
2. Show relationship: "Debtor owes Creditor ₹XX"
3. No minimization, just show all non-zero relationships

**Example:**

Balances: Alice: +₹150, Bob: ₹0, Charlie: -₹50, David: -₹100

Debts shown:
- Charlie owes Alice ₹50
- David owes Alice ₹100

**Out of Scope for MVP:**
- Settlement optimization
- Minimize number of transactions
- Suggested settlement plan
- Alternative settlement paths
- Graph visualization

---

## 9. Record Settlements (Manual Settle-up)

### 9.1 Add Settlement

**Settlement Form:**
- From (dropdown: member who is paying)
- To (dropdown: member who is receiving)
- Amount (numeric, > 0)
- Date (date picker, default: today)
- Note (optional, text)

**User Flow:**
1. User goes to group balance page
2. Taps 'Record Settlement' button
3. Fills settlement form
4. Taps 'Save'
5. Settlement is recorded, balances are updated
6. Success message shown

### 9.2 How Settlement Affects Balances

**Balance Update Logic:**

When settlement recorded (A pays B ₹100):
- A's balance increases by ₹100 (they paid)
- B's balance decreases by ₹100 (they received)
- Net effect: Reduces debt between A and B

**Example:**

Before: Charlie owes Alice ₹150  
Settlement: Charlie pays Alice ₹150  
After: Both Charlie and Alice have ₹0 balance (settled)

### 9.3 Settlement History

**View Settlements:**
- Show list of all settlements in the group
- Display: From → To, Amount, Date
- Simple chronological list (newest first)

**Out of Scope for MVP:**
- UPI integration
- Payment links or QR codes
- Payment reminders
- Edit or delete settlements
- Settlement confirmation/approval
- Partial settlement suggestions

---

## 10. Expense History with Basic Filtering

### 10.1 Expense List View

**What It Shows:**
- All expenses in the group (chronological, newest first)
- For each expense: Amount, Payer, Date, Category, Notes
- Simple list view

**Display Format:**
```
₹300 - Food
Paid by Alice on Jan 15, 2026
Dinner at restaurant
---
₹150 - Travel
Paid by Bob on Jan 14, 2026
Uber to campus
```

### 10.2 Basic Filters

**Filter Options (Simple Dropdowns):**

**Filter by Date:**
- Last 7 days
- Last 30 days
- Last 3 months
- All time (default)

**Filter by Category:**
- All categories (default)
- Food
- Travel
- Utilities
- Miscellaneous

**How Filters Work:**
- User selects filter from dropdown
- List updates immediately to show matching expenses
- Can apply both filters simultaneously
- No 'Apply Filter' button needed - instant filtering

**Out of Scope for MVP:**
- Custom date range picker
- Filter by payer
- Filter by amount range
- Search by keywords
- Sort options (always chronological)
- Pagination (show all expenses in scrollable list)

---

## 11. Basic Personal Dashboard

### 11.1 Dashboard Metrics

**Three Key Metrics Displayed:**

**1. Total Spent (Current Month)**
- Sum of user's share in all expenses this month
- Across all groups
- Format: ₹XXX.XX
- Large number, prominently displayed

**2. Total Owed (Current)**
- Total amount user owes across all groups
- Real-time calculation
- Red color if > 0, gray if = 0

**3. Category Breakdown (Current Month)**
- Simple list showing spending by category
- Format: Category: ₹XXX (XX%)
- No charts, just text list

### 11.2 Category Breakdown Details

**Display Format:**
```
Category Breakdown (This Month)

Food: ₹1,200 (48%)
Travel: ₹800 (32%)
Utilities: ₹500 (20%)

Total: ₹2,500
```

**Calculation:**
- Sum user's share in expenses by category (current month only)
- Calculate percentage of each category
- Sort by amount (highest first)
- Show top 4 categories, group rest as 'Other'

**Out of Scope for MVP:**
- Pie charts or bar graphs
- Spending trends over time
- Comparison with previous months
- Average spending metrics
- Insights or recommendations
- Group-level analytics

---

## 12. Monthly Budget Setting with Usage Indicator

### 12.1 Set Monthly Budget

**Budget Setup:**
- User sets single overall monthly budget amount
- Input: Numeric value (e.g., ₹10,000)
- Applies to current month only
- Simple input field, no categories

**User Flow:**
1. User goes to dashboard
2. Taps 'Set Budget' or edits existing budget
3. Enters monthly budget amount
4. Taps 'Save'
5. Budget is set for current month

### 12.2 Budget Usage Indicator

**Display Components:**
- Budget amount: ₹10,000
- Spent so far: ₹7,500
- Remaining: ₹2,500
- Usage percentage: 75%

**Visual Indicator:**
- Simple progress bar
- Fill color based on percentage:
  - 0-70%: Green
  - 71-90%: Yellow/Orange
  - 91-100%: Red
  - >100%: Dark red (over budget)

**Text Display:**
```
Monthly Budget

Budget: ₹10,000
Spent: ₹7,500
Remaining: ₹2,500

[========75%========>      ]
```

### 12.3 Budget Calculation

**How 'Spent' Is Calculated:**
- Sum of user's share in all expenses
- Only current calendar month
- Across all groups
- Updates in real-time when expenses are added

**Out of Scope for MVP:**
- Category-wise budgets
- Budget alerts or notifications
- Budget rollover
- Budget history
- Overspending predictions
- Budget suggestions
- Weekly budgets

---

## Technology Stack (MVP)

| Component | Technology | Justification |
|-----------|------------|---------------|
| Mobile Frontend | React Native | Cross-platform (iOS + Android), single codebase |
| Backend | Node.js + Express | JavaScript full-stack, fast development |
| Database | MongoDB | Simple schema, easy to start |
| Authentication | JWT | Stateless auth, simple implementation |
| Password Security | bcrypt | Industry standard |
| Deployment | Heroku (free tier) | Quick deployment, no DevOps complexity |
| Version Control | Git + GitHub | Standard practice |

---

## MVP Development Timeline

| Week | Focus | Features Completed |
|------|-------|-------------------|
| Week 1 | Setup & Auth | #1 User registration and login |
| Week 2 | Groups | #2 Create groups, #3 Manage members |
| Week 3 | Expenses | #4 Add expense, #5 Split options |
| Week 4 | Balances | #6 Balance calculation, #7 Summary, #8 Group overview |
| Week 5 | Settlement & History | #9 Record settlements, #10 Expense history |
| Week 6 | Dashboard & Budget | #11 Personal dashboard, #12 Budget tracking |
| Week 7-8 | Testing & Polish | Bug fixes, UI improvements, testing |

---

## Data Model (MVP)

### Collections Overview

**Users Collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  passwordHash: String,
  createdAt: Date
}
```

**Groups Collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  type: String (enum: Roommates, Trip, Mess, Misc),
  adminId: ObjectId (userId),
  members: [ObjectId] (array of userIds),
  createdAt: Date
}
```

**Expenses Collection:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  amount: Number,
  payerId: ObjectId,
  date: Date,
  category: String (enum: Food, Travel, Utilities, Misc),
  notes: String (optional),
  splitType: String (enum: equal, exact),
  splits: [
    { userId: ObjectId, amount: Number }
  ],
  createdAt: Date
}
```

**Settlements Collection:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  fromUserId: ObjectId,
  toUserId: ObjectId,
  amount: Number,
  date: Date,
  notes: String (optional),
  createdAt: Date
}
```

**Budgets Collection:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  month: String (YYYY-MM),
  amount: Number,
  createdAt: Date
}
```

---

## API Endpoints (MVP)

**Authentication:**
- POST /auth/register - Register new user
- POST /auth/login - User login

**Groups:**
- POST /groups - Create group
- GET /groups/:id - Get group details
- POST /groups/:id/members - Add member to group
- DELETE /groups/:id/members/:userId - Remove member

**Expenses:**
- POST /groups/:id/expenses - Add expense
- GET /groups/:id/expenses - Get expense list (with filters)

**Balances:**
- GET /groups/:id/balances - Get group balances
- GET /users/me/summary - Get personal balance summary

**Settlements:**
- POST /groups/:id/settlements - Record settlement
- GET /groups/:id/settlements - Get settlement history

**Dashboard & Budget:**
- GET /users/me/dashboard - Get dashboard metrics
- POST /users/me/budget - Set monthly budget
- GET /users/me/budget - Get current budget status

---

## Testing Requirements (MVP)

### Essential Test Cases

**Authentication:**
- User can register with valid email and password
- Registration fails with duplicate email
- User can login with correct credentials
- Login fails with incorrect password

**Groups:**
- User can create a group
- Admin can add members to group
- Admin can remove members from group

**Expenses:**
- User can add expense with equal split
- User can add expense with exact amounts
- Exact split validation rejects when totals don't match

**Balances:**
- Balance calculation is correct after expense added
- Balance calculation is correct after settlement recorded
- "You owe / You are owed" summary shows correct totals

**Settlements:**
- Settlement updates balances correctly
- Settlement history shows all settlements

**Dashboard:**
- Total spent calculation is accurate for current month
- Category breakdown shows correct percentages

**Budget:**
- User can set monthly budget
- Budget usage indicator shows correct percentage
- Progress bar color changes at 70% and 90%

---

## MVP Scope Boundaries (Critical)

### What Makes This an MVP

This specification intentionally excludes numerous features. The MVP focuses solely on the core user journey:

1. User creates account
2. User creates or joins a group
3. User adds expenses with simple splits
4. System calculates who owes whom
5. User manually records settlements
6. User sees basic spending summary and budget status

Everything else is deliberately deferred to post-MVP iterations.

### Scope Creep Prevention

If any of the following are requested during development, they should be firmly rejected:
- Receipt uploads or OCR
- Notifications or alerts
- Charts or graphs
- Settlement optimization
- Advanced analytics
- Social features
- Payment integration
- Any 'nice to have' features

**The mantra: "12 features, fully polished, nothing more."**

---

## Post-MVP Roadmap (For Reference)

These features are explicitly NOT part of MVP but are documented here for future planning:

### Version 2.0 (Post-MVP Phase 1):
- Settlement optimization algorithm
- Percentage and share-based splits
- Edit and delete expenses
- Push notifications
- Category-wise budgets

### Version 2.5 (Post-MVP Phase 2):
- Advanced analytics with charts
- Recurring expenses
- Receipt upload and OCR
- Data export (PDF/CSV)
- Group settings management

### Version 3.0 (Future):
- UPI integration
- AI-powered insights
- Multi-currency support
- Social features

---

## Success Criteria (MVP)

The MVP is considered successful when:

### Functional Success
- All 12 features work end-to-end without bugs
- A new user can complete the full journey in under 10 minutes
- Balance calculations are 100% accurate
- App works on both iOS and Android

### Technical Success
- No critical bugs in production
- API response time < 2 seconds for 95% of requests
- App loads in < 3 seconds on average device
- All test cases pass

### User Success
- 5 test users successfully use the app for 1 week
- Users report the app solves their expense tracking problem
- No major usability complaints

### Documentation Success
- README with setup instructions
- API documentation complete
- Basic user guide created

---

**Document Status:** Final and Locked  
**Version:** MVP 1.0  
**Last Updated:** February 2026

**No feature additions permitted without formal approval and timeline adjustment.**

---

*End of PayCircle MVP Specification*  
*12 Features - 6-8 Weeks - No Scope Creep*
