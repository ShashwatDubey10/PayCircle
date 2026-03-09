# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- JavaScript (CommonJS backend, ES6+ frontend) - All backend code in `/backend/src/`
- JSX (React Native) - All frontend code in `/frontend/app/`, `/frontend/components/`, `/frontend/services/`

**Secondary:**
- TypeScript - Configuration only (tsconfig.json for path resolution); no .ts/.tsx files in codebase

## Runtime

**Environment:**
- Node.js (latest LTS recommended; no specific version pinned in package.json)
- Expo Go for mobile development (installed on Android/iOS device)

**Package Manager:**
- npm (CommonJS for backend)
- npm (for frontend; integrates with Expo)
- Lockfiles present: `backend/package-lock.json`, `frontend/package-lock.json`

## Frameworks

**Core:**
- Express.js 5.2.1 - REST API framework (`backend/src/index.js`)
- React Native 0.81.5 - Mobile app framework (`frontend/package.json`)
- Expo SDK 54.0.33 - React Native development platform (`frontend/package.json`)
- Expo Router 6.0.23 - File-based routing for Expo (`frontend/app/`)

**Testing:**
- No testing framework installed (lint command available but no test runner)

**Build/Dev:**
- nodemon 3.1.14 - Auto-restart backend on file changes (`npm run dev` in `backend/`)
- Metro (built into Expo) - JavaScript bundler for React Native
- ESLint - Linting for frontend (`frontend/eslint.config.js`, `npm run lint`)
- TypeScript 5.9.2 - Type checking for IDE/paths only (frontend)
- Babel - Transpilation (frontend, via Expo)

## Key Dependencies

**Critical:**
- mongoose 9.2.2 - MongoDB ODM; connects to MongoDB Atlas (`backend/src/config/db.js`)
- bcryptjs 3.0.3 - Password hashing (`backend/src/models/User.js`)
- jsonwebtoken 9.0.3 - JWT authentication; signed with `JWT_SECRET` (`backend/src/middleware/auth.js`)
- axios 1.13.5 - HTTP client for frontend API calls (`frontend/services/api.js`)

**Infrastructure:**
- helmet 8.1.0 - Security headers middleware (`backend/src/index.js`)
- cors 2.8.6 - Cross-origin resource sharing (`backend/src/index.js`)
- dotenv 17.3.1 - Environment variable loading (`backend/src/index.js`)
- morgan 1.10.1 - Installed but not used; replaced by custom logger (`backend/src/utils/logger.js`)

**React Native / Expo:**
- @react-native-async-storage/async-storage 2.2.0 - Persistent device storage for JWT/user (`frontend/services/auth.js`)
- @react-navigation/native 7.1.8 - Navigation framework (replaced by Expo Router)
- @react-navigation/bottom-tabs 7.4.0 - Tab navigation component
- react-native-safe-area-context 5.6.0 - Safe area handling for notches/status bars
- react-native-screens 4.16.0 - Native screen implementation
- react-native-gesture-handler 2.28.0 - Touch gesture library
- react-native-reanimated 4.1.1 - Animation library
- @expo/vector-icons 15.0.3 - Icon library (FontAwesome, etc.)
- expo-constants 18.0.13 - Access to app constants (hostUri for dynamic IP) (`frontend/services/api.js`)
- expo-router 6.0.23 - File-based routing (primary navigation)
- expo-font 14.0.11 - Custom font loading
- expo-image 3.0.11 - Optimized image handling
- expo-linking 8.0.11 - Deep linking support
- expo-splash-screen 31.0.13 - Splash screen configuration
- expo-status-bar 3.0.9 - Status bar styling
- expo-symbols 1.0.8 - Symbol icon support
- expo-system-ui 6.0.9 - System UI integration
- expo-web-browser 15.0.10 - In-app browser (for OAuth/auth flows)

## Configuration

**Environment:**
- Backend: `backend/.env` file (template at `backend/.env.example`)
  - `MONGO_URI` - MongoDB Atlas connection string
  - `PORT` - API server port (default 5000)
  - `JWT_SECRET` - 32-byte hex for JWT signing
  - `JWT_EXPIRES_IN` - Token expiry (e.g., "7d")
  - `NODE_ENV` - "development" or "production"
  - `CLIENT_URL` - CORS origin (frontend URL)
- Frontend: No `.env` file; uses dynamic IP detection via `expo-constants` (`frontend/services/api.js`)

**Build:**
- Backend: CommonJS (type: "commonjs" in `backend/package.json`)
- Frontend:
  - `frontend/tsconfig.json` - Path alias mapping (`@/*` → `frontend/*`)
  - `frontend/metro.config.js` - Metro bundler config (uses Expo defaults)
  - `frontend/babel.config.js` - Babel transpilation
  - `frontend/app.json` - Expo app config (name, icon, plugins, Android/iOS settings)

## Platform Requirements

**Development:**
- macOS / Linux / Windows with bash (WSL on Windows)
- Node.js + npm
- For Android: Android SDK (optional; Expo Go used instead)
- For iOS: Xcode (optional; Expo Go used instead)
- Expo Go app on physical device or emulator
- `npx expo start` to start Metro bundler

**Production:**
- Backend: Node.js hosting (any provider: Heroku, Railway, AWS, etc.)
- Frontend: React Native app distributed via Google Play / Apple App Store (via Expo eas)
  - MongoDB Atlas cloud database (currently configured)
  - CORS-enabled backend (specified by `CLIENT_URL` in `.env`)

---

*Stack analysis: 2026-03-09*
