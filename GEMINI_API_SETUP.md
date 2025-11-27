# Getting a Valid Gemini API Key

Your current Gemini API key is not working (404 errors). Follow these steps:

## Step 1: Get a New API Key

1. Go to **Google AI Studio**: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the new API key (starts with `AIza...`)

## Step 2: Update Your .env File

Open `backend/.env` and replace the current key:

```env
GEMINI_API_KEY=YOUR_NEW_KEY_HERE
```

## Step 3: Test the Key

Run this command to verify:

```bash
cd backend
node scripts/testGeminiRaw.mjs
```

You should see "✅ API Key works!"

## Step 4: Restart the Application

```bash
cd ..
.\run_dev.ps1
```

## Alternative: Use Mock Mode (Current Workaround)

If you want to continue without fixing the API key:

1. Set `USE_MOCK=true` in `backend/.env`
2. Restart the app
3. Note: Mock mode has lower accuracy but works offline

---

**Current Status**: Your API key `AIzaSyA_MlKaXX9z-DC-aJ5zltSyYbHZPD-DVPc` is returning 404 errors, which typically means:
- The key is invalid/revoked
- The key is for a different Google service
- The key has expired
- API access is restricted
