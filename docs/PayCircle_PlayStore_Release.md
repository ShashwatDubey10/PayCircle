# PayCircle — Google Play Release Guide

Written against the repo as it stands: Expo SDK 54, dev-build workflow, backend on Render.

**Read Part 0 before doing anything else.** Two of the four blockers need code changes,
and one of them adds a mandatory two-week wait that you cannot shorten.

---

## Part 0 — Blockers, in order of lead time

### 0.1 The 14-day closed test (start this first — it gates everything)

Personal Play developer accounts created after 13 November 2023 must run a **closed test
with at least 12 testers opted in continuously for at least 14 days** before they can even
*apply* for production access.

- Internal testing does **not** count. Only a closed track does.
- "Continuously" matters — if testers drop below 12, the clock restarts.
- Meeting the bar makes you *eligible to apply*, not automatically approved.

So the real timeline is roughly: account setup → first build → closed track live → **+14 days
minimum** → apply → review. Budget three to four weeks, not a weekend.

Because this is the long pole, get the account registered and a build onto a closed track
as early as possible, even while the items below are still being finished.

Cost: **$25 USD, one time**, at registration.

### 0.2 Account deletion — built, needs a URL

Google Play requires any app offering account creation to also offer account deletion:
an **in-app path**, plus a **publicly reachable web URL** where deletion can be requested
without installing the app. The URL is entered in Play Console.

**Done:** `DELETE /api/auth/me` (password-confirmed), a Delete Account entry at the bottom
of Profile, and a ready page at `docs/account-deletion.html`.

The account is **tombstoned**, not erased. `balanceService` sums over `Group.members`, so
removing a member id would silently rewrite what everyone else in that group owes. Private
data (personal transactions, budgets, private categories, friendships, personal contacts and
their splits) is deleted outright; shared ledger rows stay with the identity stripped and the
name shown as "Deleted user". Admin role passes to a remaining member; solo groups are
removed with their ledger.

**Still yours to do:** publish `docs/account-deletion.html` at a public URL, fill in the
three `[PLACEHOLDER]` fields in it, and paste the URL into Play Console.

### 0.3 Privacy policy — drafted, needs a URL

**Done:** `docs/privacy-policy.html`, written against what the code actually does.

**Still yours to do:** publish it, fill in its `[PLACEHOLDER]` fields, and paste the URL into
Play Console. Both pages link to each other, so publish them together.

GitHub Pages serving from `/docs` on the default branch works and costs nothing. The URLs
then look like `https://<user>.github.io/<repo>/privacy-policy.html`.

### 0.4 Render cold start vs the 10-second HTTP timeout

`frontend/services/api.js` sets `timeout: 10000`. Render's free tier spins containers down
when idle, and a cold start commonly takes **30–60 seconds**.

The first launch of the day will therefore fail on login with "Something went wrong" — for
every tester, and then every real user. This is not a policy blocker, but it will sink a
closed test, since testers judge the app on first launch.

**Done:** `services/api.js` now retries a timed-out request once with a 60s timeout, and
`RootGuard` shows a full-screen "Waking up the server" state while that retry is in flight.
Normal requests still fail fast at 10s, so only a genuine cold start pays the cost.

This makes the wait honest rather than invisible — it does not make it short. Moving the
backend to a paid always-on tier is still the real fix, and worth doing before the closed
test if you can.

Note the base URL already falls back correctly, so nothing is needed there:

```js
// services/api.js — hostUri is undefined in a store build, so production wins
return 'https://paycircle-bvzs.onrender.com';
```

---

## Part 1 — Fix the app config

### 1.1 `eas.json`

**Done** — it was a 0-byte file, which `eas build` cannot parse. It now contains:

```json
{
  "cli": {
    "version": ">= 20.4.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "android": { "track": "alpha" }
    }
  }
}
```

Three deliberate choices:

- **`"buildType": "app-bundle"`** — Play requires an **AAB**, not an APK. The `preview`
  profile stays APK so you can sideload it for your own testing.
- **`"track": "alpha"`** — `alpha` is what the API calls the **closed testing** track.
  This matters because of 0.1: Google's 14-day requirement is satisfied only by a
  closed test. `internal` uploads succeed and look identical in the console, but the
  14 days never start counting — you would find out two weeks later, when applying
  for production access failed.

- **`appVersionSource: "remote"` + `autoIncrement: true`** — EAS tracks `versionCode`
  server-side and bumps it per build. This matters here because `android/` is gitignored and
  regenerated by prebuild, so a `versionCode` edited in `android/app/build.gradle` would be
  wiped. Play rejects any upload whose `versionCode` is not higher than the last one, so you
  want this managed somewhere durable.

### 1.2 `app.json`

`version` is the user-visible string ("1.0.0"); bump it for meaningful releases. With
`appVersionSource: "remote"` you do **not** add `versionCode` by hand.

`eas init` will add `extra.eas.projectId`. That also switches push notifications on —
`app/_layout.jsx:89` reads exactly that value and silently skips registration while it is
absent. If you do not want push in v1, leave it; the code already no-ops safely. If you do,
you must additionally upload FCM v1 credentials to EAS.

---

## Part 2 — EAS setup

EAS Build is the right choice for this project specifically because `CLAUDE.md` forbids
hand-editing `android/`. The alternative — a local `gradlew bundleRelease` — needs a release
keystore wired into `android/app/build.gradle`, which prebuild regenerates. EAS keeps the
keystore server-side instead, so nothing in `android/` has to change.

This also fixes a real problem in the current generated project: the `release` buildType is
signed with the **debug keystore**.

```gradle
release {
    // Caution! In production, you need to generate your own keystore file.
    signingConfig signingConfigs.debug
}
```

Play rejects debug-signed uploads outright.

Run from `frontend/`:

```bash
npx eas login
```

```bash
npx eas init
```

```bash
npx eas build:configure
```

`eas init` creates the EAS project and writes `extra.eas.projectId` into `app.json`.

---

## Part 3 — Build the AAB

```bash
npx eas build --platform android --profile production
```

On the first run EAS asks whether to generate a new Android keystore. **Say yes, and let EAS
keep it.**

> Losing this keystore means you can never update the app again under the same listing — the
> only remedy is Play App Signing key rotation, which you have to request from Google. Once
> the build succeeds, run `npx eas credentials` and take a backup.

The build runs in the cloud; free-tier queues can be slow. When it finishes you get a `.aab`
download link.

Before uploading anything, install the `preview` APK on a real phone and test against the
**production** backend, not your laptop:

```bash
npx eas build --platform android --profile preview
```

This is the first build where `hostUri` is absent, so it is the first time the Render URL is
actually exercised. Check login, group creation, add expense, settle up, and the UPI QR.

---

## Part 4 — Play Console setup

At <https://play.google.com/console>, pay the $25, then **Create app**.

- App name: PayCircle
- Default language, app type **App**, **Free**
- Confirm the declarations

Then work through everything marked with a red dot in the dashboard:

| Section | Notes for this app |
|---|---|
| **Privacy policy** | The URL from 0.3. Required. |
| **App access** | Give Google a working test login — the whole app is behind auth, so a reviewer with no account sees nothing and will reject it. |
| **Ads** | No ads. |
| **Content rating** | Questionnaire. A finance tracker rates very low, but answer honestly. |
| **Target audience** | 18+. Do **not** select child audiences — it triggers Families policy. |
| **Data safety** | The long one — see the mapping below. It must not contradict the privacy policy. |
| **Financial features** | Declare accurately: PayCircle *tracks* shared expenses and *generates UPI QR codes*. It does not process payments or move money. Overclaiming here invites a much stricter review. |
| **Store listing** | Title ≤30 chars, short description ≤80, full description ≤4000. Needs a 512×512 icon, a 1024×500 feature graphic, and at least 2 phone screenshots (4–8 is better). |

### Data safety answers

Google cross-checks this against your privacy policy, and a contradiction is a common
rejection. These answers match `docs/privacy-policy.html` and the code:

| Question | Answer |
|---|---|
| Data collected | Name, email, user IDs (username), **financial info** (other), app activity |
| Optional data | UPI ID, phone, avatar |
| Collected or shared? | **Collected**, not shared with third parties for ads or analytics |
| Processed ephemerally? | No — it is stored |
| Encrypted in transit? | **Yes** (HTTPS) |
| Can users request deletion? | **Yes** — in-app and via the deletion URL |
| Data used for advertising? | **No** |
| Analytics / tracking SDKs? | **None** |
| Location | **Not collected** |
| Photos / camera | Camera is used for QR scanning only; **no images collected** |
| Contacts | **Not collected** — contacts are typed in by hand, the device address book is never read |

The two that cause trouble if you answer carelessly: **camera** (permission requested, but no
image data collected — these are different questions) and **contacts** (the app has a feature
called "personal contacts" that does *not* read the device contact list).

Screenshots have to come from a real device or emulator — Dashboard, a group with balances,
Add Expense and the settle flow make a sensible set.

---

## Part 5 — Closed testing

1. **Testing → Closed testing → Create track**
2. Upload the `.aab`
3. Create an email list with **at least 12 Google accounts** (real ones that will actually
   opt in — classmates work)
4. Share the opt-in link; each tester must open it and accept
5. Confirm the count shows 12+ **before** the clock starts

Then wait **14 days** with the count never dropping below 12. Ask testers to actually open
the app occasionally; Google also looks at engagement when reviewing the application.

Use this window productively — it is the natural time to work through
`docs/PayCircle_Bug_List.md`. Pushing new builds to the closed track does not reset the
timer; losing testers does.

---

## Part 6 — Production

After 14 days the Play Console dashboard surfaces an **Apply for production access** form.
It asks how you tested and what you learned — answer it properly, with specifics from the
closed test. Vague answers get bounced.

Once granted: **Production → Create new release** → upload the AAB (or promote the closed
track build) → roll out. First review typically takes a few days and can take longer for a
first-time developer.

Consider a **staged rollout** (20%) rather than 100% on day one.

---

## Part 7 — Shipping updates afterwards

```bash
npx eas build --platform android --profile production
```

`autoIncrement` handles `versionCode`. Bump `version` in `app.json` yourself when the release
is user-visible. Then upload to a track, or automate it:

```bash
npx eas submit --platform android --latest
```

Over-the-air updates are **not** available in this project as it stands: `expo-updates` is
not installed, so every change needs a real build and a real review. If you want OTA later,
`npx expo install expo-updates` plus an `eas update` channel per build profile enables it for
JS-only changes — native config and native dependencies always need a rebuild regardless.

---

## Summary checklist

- [ ] Register Play developer account ($25)
- [x] Account deletion — API + Profile entry built
- [ ] Publish `docs/account-deletion.html` and fill its placeholders
- [x] Privacy policy drafted (`docs/privacy-policy.html`)
- [ ] Publish both pages, fill their placeholders, paste URLs into Play Console
- [x] Render cold start handled in the client (retry + waking state)
- [ ] Consider a paid always-on backend tier before the closed test
- [x] `eas.json` written (schema-validated on your first build)
- [ ] `eas login` → `eas init` → `build:configure`
- [ ] Build `preview` APK, test against production backend on a real phone
- [ ] Build `production` AAB, back up the keystore
- [ ] Complete every Play Console section, including App access credentials
- [ ] Prepare icon, feature graphic, screenshots
- [ ] Closed track + 12 testers, hold 14 days
- [ ] Apply for production access
- [ ] Create production release, staged rollout
