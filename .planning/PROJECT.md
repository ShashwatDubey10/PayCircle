# PayCircle

## What This Is

PayCircle is an Android-first financial management app for college students. Its core purpose is splitting shared expenses among groups of people — tracking who paid what, who owes whom, and simplifying debts down to the fewest possible transactions. It also supports personal budgeting (overall + category-wise) alongside the group expense tracking.

## Core Value

Making it effortless to know exactly who owes whom and how much — across all shared expenses — so money never creates awkwardness between friends.

## Requirements

### Validated

- ✓ User registration and login with JWT session persistence — existing
- ✓ Group creation, listing, and detail view — existing
- ✓ Group member add/remove — existing
- ✓ Group expenses with equal and exact-split modes — existing
- ✓ Greedy debt simplification (minimal payment graph for group balances) — existing
- ✓ Settlements (record and list payments between members) — existing
- ✓ Personal transactions (income/expense, create/list/delete) — existing
- ✓ Monthly budget (set budget, track spending) — existing
- ✓ Dashboard aggregating group and personal finances — existing

### Active

- [ ] Username field on User model (for friend lookup)
- [ ] Friend request system: search user by username, send request
- [ ] In-app pending requests section with badge indicator
- [ ] Push notifications (Expo) when a friend request is received
- [ ] Accept / reject friend requests
- [ ] Friends list view on profile
- [ ] Group member add restricted to friends only (existing members grandfathered in)

### Out of Scope

- iOS support — Android-only for now, iOS considered later
- Group join-by-invite or group invite acceptance step — once users are friends, group adds remain direct (no second approval)
- Retroactive friend enforcement on existing group members — only new adds require friendship

## Context

- Monorepo: `backend/` (Express 5 + MongoDB Atlas) and `frontend/` (React Native, Expo SDK 54)
- All frontend source files are `.jsx`/`.js` — no TypeScript
- Currency is INR (₹) hardcoded throughout — no i18n layer
- Path alias `@/` maps to `frontend/` for all internal imports
- Theme tokens from `constants/theme.js` as `PC` object — never hardcode colors
- Backend uses `asyncHandler` wrapper on all controllers — no try/catch, always throw
- Mongoose 9 async pre-save hooks must be promise-based (no `next` parameter)

## Constraints

- **Platform:** Android first — no iOS-specific APIs or tooling in scope
- **Auth:** JWT-based, stored in AsyncStorage, verified by `protect` middleware
- **Stack:** Express 5 + Mongoose 9 + React Native + Expo — no switching frameworks
- **Currency:** INR hardcoded — no multi-currency, no i18n

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Username-based friend lookup | Simpler than phone/QR, works without contacts permission | — Pending |
| Friend request requires explicit accept | Consent before being added to groups | — Pending |
| Existing group members grandfathered in | Avoids breaking existing groups when feature ships | — Pending |
| Push notifications via Expo | Already on Expo — minimal setup overhead | — Pending |

---
*Last updated: 2026-03-09 after initialization*
