# PayCircle — Android Dev Build Setup (Windows)

One-time setup to replace Expo Go with a real development build.

**Why:** Expo Go is a prebuilt sandbox that ignores your `app.json` native config. Your
`gradle.properties` has `edgeToEdgeEnabled=true` and your manifest has
`windowSoftInputMode="adjustResize"` — neither applies in Expo Go, so safe-area, keyboard and
status-bar behaviour can't be tested there. It's also why the SDK 54 vs 58 mismatch blocked you.

**After this is done:** you rebuild only when native config or a native dependency changes.
Ordinary JSX edits hot-reload over Metro exactly as they do today.

> **Use PowerShell, not Command Prompt.** Every command below is PowerShell syntax. In cmd.exe
> `;` is not a separator and `$env:VAR` means nothing, so the commands fail with confusing
> errors. Open **Windows Terminal** (Win+X → Terminal), or type `powershell` inside an existing
> cmd window to switch. The prompt should read `PS C:\...>` — if it reads `C:\...>` you're in cmd.
>
> Work through the steps in order. Each ends with a **✅ Verify** command. If the output doesn't
> match, stop there and send me what you got — don't push on to the next step.

---

## Step 1 — JDK 17

You currently have **JDK 20**. Expo SDK 54 / React Native 0.81 require **JDK 17**; newer JDKs
fail during the Gradle build. Installing 17 does *not* remove 20 — they coexist, and `JAVA_HOME`
decides which one Gradle uses.

1. Download **Eclipse Temurin 17 (LTS)**, Windows x64 `.msi`:
   https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64
2. Run the installer. On the **Custom Setup** screen, enable:
   - *Set JAVA_HOME variable*
   - *Add to PATH*
3. **Close every open terminal** (env vars only refresh in new ones).

If the installer didn't set `JAVA_HOME`, set it manually in a new PowerShell window — adjust the
version folder to match what was actually installed:

```powershell
[Environment]::SetEnvironmentVariable('JAVA_HOME','C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot','User')
```

**✅ Verify** — in a *new* terminal:

```powershell
java -version; echo $env:JAVA_HOME
```

Expect `openjdk version "17.x.x"` and a `JAVA_HOME` path containing `jdk-17`.
If it still prints 20, your `JAVA_HOME` is wrong or the terminal is stale.

---

## Step 2 — Android Studio + SDK

1. Download: https://developer.android.com/studio
2. Run the installer, accept defaults.
3. On first launch, the **Setup Wizard** appears → choose **Standard** → Next → accept all
   licences → Finish. It downloads the SDK, platform-tools and build-tools (~3–4 GB, 10–20 min).

You don't need to pick an API level — Expo's Gradle plugin declares what it needs and Gradle
fetches it.

**✅ Verify** — the SDK folder should now exist:

```powershell
Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
```

Expect `True`. If `False`, open Android Studio → **More Actions → SDK Manager**, note the
*Android SDK Location* at the top, and use that path in Step 3 instead.

---

## Step 3 — ANDROID_HOME and PATH

Currently unset. Run both lines in PowerShell:

```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME',"$env:LOCALAPPDATA\Android\Sdk",'User')
```

```powershell
$p=[Environment]::GetEnvironmentVariable('Path','User'); if($p -notlike "*Android\Sdk\platform-tools*"){[Environment]::SetEnvironmentVariable('Path',"$p;$env:LOCALAPPDATA\Android\Sdk\platform-tools",'User'); "Added"} else {"Already present"}
```

(Safe to re-run — it checks before appending, so your PATH can't collect duplicates.)

**Close and reopen your terminal.**

**✅ Verify:**

```powershell
echo $env:ANDROID_HOME; adb version
```

Expect the SDK path and `Android Debug Bridge version 1.0.4x`.

---

## Step 4 — Prepare your phone

1. **Settings → About phone** → tap **Build number** 7 times → "You are now a developer".
2. **Settings → System → Developer options** → enable **USB debugging**.
3. Plug the phone into the PC with a USB **data** cable (charge-only cables won't work).
4. A dialog appears on the phone: *Allow USB debugging?* → tick *Always allow* → **Allow**.
   If no dialog appears, unplug/replug, or change USB mode to **File transfer (MTP)**.

**✅ Verify:**

```powershell
adb devices
```

Expect your device listed as `device`. If it says `unauthorized`, you missed the phone dialog.
If the list is empty, try another cable or USB port.

---

## Step 5 — Build and install

From `frontend/`. The existing `android/` folder is from an abandoned attempt and is missing
`local.properties`, so regenerate it cleanly first:

```bash
npx expo prebuild --clean
```

Then build and install onto the connected phone:

```bash
npx expo run:android
```

**First build takes 10–20 minutes** — Gradle downloads dependencies and compiles the native
project. Later builds are far faster, and you only rebuild when native config changes.

When it finishes, **PayCircle** is installed as a real app and Metro starts automatically.

**✅ Verify:** the app launches on your phone and shows the login screen.

---

## Step 6 — Start the backend

In a second terminal, from `backend/`:

```bash
npm run dev
```

Your phone and PC must be on the **same Wi-Fi network**. `services/api.js` derives the backend IP
from Metro's host automatically, so nothing needs editing.

**✅ Verify:** register or log in successfully from the phone.

---

## Step 7 — Test the P0 fixes

See the table in `PayCircle_Audit.md` for all 11. Highest-value checks:

- **Split tab → + → New Group** — type chips appear and the group actually creates (#1)
- That sheet slides up from the **bottom**, not the top (#5)
- **Profile → Help & FAQ** — list scrolls and the **Close button is visible** (#6)
- **Dashboard → Recent Activity** after a direct split — shows **−₹(your half)** in red, not
  +₹(full) in green (#10)
- Add a contact, split with them, delete the contact — history still shows their **name** (#2)

---

## Daily workflow after setup

```bash
npx expo start
```

Press `a` to open on Android, or launch PayCircle on the phone and it connects to Metro.
Re-run `npx expo run:android` **only** after editing `app.json` or adding a native dependency.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Unsupported class file major version` | Wrong JDK. Re-check Step 1 `java -version` — must be 17 |
| `SDK location not found` | `ANDROID_HOME` unset or terminal stale. Redo Step 3, reopen terminal |
| `Failed to install ... INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An old PayCircle build is installed. `adb uninstall com.paycircle.app` then rebuild |
| Build fails on `:app:mergeDebugResources` or similar, first try | Often transient. `cd android && ./gradlew clean` then rebuild |
| Metro connects but screens are blank | Backend not running, or phone on a different network than the PC |
| `adb` not recognised | platform-tools missing from PATH — redo Step 3 |
| `prebuild --clean` fails with `EBUSY: resource busy or locked, rmdir 'android'` | Windows file lock, usually VS Code's file watcher (or Android Studio / a Gradle daemon). Delete the folder from a shell first — `rm -rf android` in Git Bash, or `Remove-Item -Recurse -Force android` in PowerShell — then run `npx expo prebuild --platform android` |
| Gradle runs out of memory | Raise `org.gradle.jvmargs=-Xmx4096m` in `android/gradle.properties` |

> `android/` is **generated and gitignored**. Never edit it by hand — change `app.json` and re-run
> `npx expo prebuild --clean`. Any manual edit is wiped on the next prebuild.
