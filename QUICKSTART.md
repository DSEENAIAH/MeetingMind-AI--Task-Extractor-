# MeetingMind - Quick Start Guide

Welcome! This guide gets you up and running in 2 minutes.

---

## ✅ What's Already Done

Both frontend and backend are **running right now**:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

---

## 🎯 Try the Demo (60 seconds)

### Step 1: Open the App
Visit: http://localhost:3000

### Step 2: Load Sample Notes
Click the blue "Load sample meeting notes" button at the bottom

### Step 3: Extract Tasks
Click "Extract Tasks" (or press Ctrl+Enter)

### Step 4: Preview & Edit
- Wait 1 second for redirect to preview page
- Click pencil icon to edit a task
- Click trash icon to remove a task

### Step 5: Create in Zoho (Mock Mode)
Click "Create in Zoho Projects" → See success with fake URLs

**That's it!** You've just seen the full flow.

---

## 🔧 How It Works Right Now

### Mock Mode (Current State)
- ✅ **No API keys needed** - Uses pattern matching instead of AI
- ✅ **No Zoho credentials needed** - Returns fake task URLs
- ✅ **100% offline capable** - Everything works locally
- ✅ **Deterministic** - Same input = same output (great for demos)

### What Mock Mode Does
1. **Extracts tasks** from bullet points, TODO, ACTION keywords
2. **Detects priority** from words like "urgent", "ASAP", "critical"
3. **Finds assignees** from @mentions or "Name will do X" patterns
4. **Parses due dates** from "by Friday", "EOD", etc.
5. **Returns structured JSON** matching the AI format

---

## 🚀 Next Steps (When You're Ready)

### Add Real AI Extraction

1. **Get an API key:**
   - OpenAI: https://platform.openai.com/api-keys
   - Or Anthropic Claude: https://console.anthropic.com/
   - Or Google Gemini: https://ai.google.dev/

2. **Set environment variables:**
   ```powershell
   # In backend/.env
   USE_MOCK=false
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   ```

3. **Implement the AI call:**
   - Create `backend/src/lib/llmClient.ts`
   - See `PROMPT.md` for exact prompts to use
   - Example code is in the TODO comments

### Add Real Zoho Integration

1. **Set up Zoho OAuth:**
   - Go to https://api-console.zoho.com/
   - Create a new "Server-based Application"
   - Get Client ID and Client Secret

2. **Configure backend:**
   ```powershell
   # In backend/.env
   ZOHO_CLIENT_ID=1000.XXXXX
   ZOHO_CLIENT_SECRET=xxxxx
   ZOHO_REDIRECT_URI=http://localhost:5000/api/auth/zoho/callback
   ```

3. **Test OAuth flow:**
   - Visit http://localhost:5000/api/auth/zoho
   - Authorize with your Zoho account
   - Tokens stored in session

4. **Implement task creation:**
   - Edit `backend/src/routes/createTasks.ts`
   - Replace `createTasksMock()` with `createTasksZoho()`
   - See TODO comments for API details

---

## 🐛 Troubleshooting

### Frontend won't load
```powershell
cd frontend
npm install
npm run dev
```
Then visit http://localhost:3000

### Backend won't start
```powershell
cd backend
npm install
npm run dev
```
Check http://localhost:5000/health

### "Cannot find module" errors
Make sure you're in the right directory:
```powershell
# This should show both folders:
ls
# Output: backend/, frontend/, README.md, etc.
```

### Tasks not extracting
- Make sure backend is running (check http://localhost:5000/health)
- Check browser console (F12) for errors
- Try the sample notes button
- Check backend terminal for logs

### Port already in use
```powershell
# Kill process on port 3000 (frontend)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Kill process on port 5000 (backend)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

---

## 📝 File Overview

### Key Frontend Files
- `frontend/src/pages/PasteNotes.tsx` - Main input page
- `frontend/src/pages/PreviewTasks.tsx` - Task review/edit
- `frontend/src/api/apiClient.ts` - API communication
- `frontend/src/components/TaskRow.tsx` - Individual task UI

### Key Backend Files
- `backend/src/server.ts` - Express server setup
- `backend/src/routes/extract.ts` - Extraction endpoint
- `backend/src/routes/createTasks.ts` - Zoho integration
- `backend/src/lib/mockExtractor.ts` - Mock extraction logic
- `backend/src/types/index.ts` - Shared types

### Documentation
- `README.md` - Full documentation (you're here!)
- `DEMO.md` - 90-second demo script
- `PROMPT.md` - AI prompting guide
- `QUICKSTART.md` - This file

---

## 🎓 Learning Resources

### How Mock Extraction Works
Open `backend/src/lib/mockExtractor.ts` and read the comments.

### How Real AI Would Work
Check out `PROMPT.md` for the exact prompts and examples.

### How Zoho OAuth Works
Look at `backend/src/routes/auth.ts` - the flow is documented step-by-step.

### Frontend State Management
See `frontend/src/pages/PasteNotes.tsx` for React hooks patterns.

---

## 💡 Pro Tips

1. **Use Ctrl+Enter** in the notes textarea to extract quickly
2. **Edit tasks in preview** before creating them (click pencil icon)
3. **Check the Network tab** (F12) to see API requests/responses
4. **Read the TODO comments** in code - they explain next steps
5. **Run tests** to see how components/functions should behave

---

## 🚢 Ready to Deploy?

### Deploy Frontend (Vercel)
```powershell
cd frontend
npm run build
# Upload dist/ folder to Vercel or run: vercel --prod
```

### Deploy Backend (Render/Heroku)
```powershell
cd backend
npm run build
# Push to Render/Heroku or use Dockerfile
```

See the "Deployment" section in README.md for full instructions.

---

## 🙋 Need Help?

- **Questions about the code?** Check the docblock comments at the top of each file
- **API not working?** Check http://localhost:5000/health
- **UI looks broken?** Make sure Tailwind CSS is loaded (check browser console)
- **Want to add a feature?** Look for TODO comments in relevant files

---

**You're all set! The full-stack app is running and ready to customize.** 🚀

Start by trying the demo flow at http://localhost:3000, then explore the code!
