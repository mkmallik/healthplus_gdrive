# HealthPlus – Google Drive Edition

Frontend-only health tracker. You bring your own OpenAI key. All data lives in a Google Sheet in your own Drive.

## Quick Start

```bash
cd healthplus_gdrive
npm install
npx expo start
```

---

## Google Cloud Setup (one-time, ~5 min)

### 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com
2. Create new project: "HealthPlus"

### 2. Enable APIs
- API Library → search "Google Sheets API" → Enable
- API Library → search "Google Drive API" → Enable

### 3. Create OAuth 2.0 credentials
1. Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Name: "HealthPlus"
4. **Authorised redirect URIs** — add ALL of these:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/healthplus-gdrive
   healthplus-gdrive://oauth2redirect
   exp://localhost:8081
   ```
5. Click Create → copy the **Client ID**

### 4. Configure OAuth consent screen
1. OAuth consent screen → External
2. Add your Google account as a **Test user**
3. Scopes: add `spreadsheets` and `drive.file`

### 5. In the app
1. Open HealthPlus → paste your Client ID → tap "Connect Google Drive"
2. Sign in with Google → approve access
3. App creates a "HealthPlus Data" spreadsheet in your Drive automatically

---

## What gets stored where

| Data | Location |
|------|----------|
| Meal & food logs | Google Sheet: `foods`, `meals` tabs |
| Exercise logs | Google Sheet: `exercises` tab |
| Steps, body metrics | Google Sheet: `step_entries`, `body_metrics` tabs |
| Habits & todos | Google Sheet: `habits`, `habit_logs`, `todo_items` tabs |
| Notes | Google Sheet: `notes` tab |
| Reminders | Google Sheet: `reminders` tab |
| **Food photos, audio** | **Google Drive: "HealthPlus Files" folder** |
| OpenAI API key | Device SecureStore (never leaves device) |
| Google OAuth tokens | Device SecureStore (never leaves device) |
| Media cache | Device cache dir (auto-managed, clearable from Settings) |

---

## How data flows

```
App starts
  ↓
Check SecureStore for Google tokens
  ↓ (found)
Load all 14 sheets → in-memory cache
  ↓
User interacts → reads from cache (fast)
  ↓ any write
Update cache immediately + write to Google Sheets API
```

Reads are instant (from memory). Writes are ~300ms (Sheets API call). On next app launch, latest data is fetched fresh from Sheets.

**Media (photos & audio):**
```
saveFile(uri) → upload to Drive → store "gdrive:<fileId>" in Sheet
getFileUri(ref) → check local cache → hit? return it
                → miss? download from Drive → cache → return URI
```
Files load instantly after first access. Cache is clearable from Settings → "Clear Local Media Cache".

---

## Running on a real device

For physical devices, you also need to add your local IP redirect URI:
```
exp://192.168.x.x:8081
```
Or use tunnel mode: `npx expo start --tunnel`

---

## Production build

```bash
npm install -g eas-cli
eas build --platform android   # APK / AAB
eas build --platform ios       # IPA (requires Apple Developer account)
```

For production, switch OAuth client type to **iOS** (no secret needed) or **Android** and update the redirect URIs.
