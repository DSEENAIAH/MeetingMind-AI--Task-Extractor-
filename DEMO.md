# MeetingMind - 90 Second Demo Script

This guide walks through a complete demo of MeetingMind in under 90 seconds.

---

## Prerequisites

- Frontend running at http://localhost:3000
- Backend running at http://localhost:5000
- Both in mock mode (USE_MOCK=true)

---

## Demo Script (90 seconds)

### Step 1: Introduction (10 seconds)
**Say:**
> "MeetingMind extracts actionable tasks from meeting notes using AI and creates them directly in Zoho Projects. Let me show you how it works."

**Do:**
- Open http://localhost:3000 in browser
- Show the clean, simple landing page

---

### Step 2: Paste Notes (15 seconds)
**Say:**
> "Let's say I just finished a team standup. Instead of manually creating tasks, I'll paste my notes here."

**Do:**
- Click "Load sample meeting notes" button
- Show the textarea filled with realistic meeting notes
- Point out the different task formats (bullets, TODO, ACTION items)

---

### Step 3: Extract Tasks (20 seconds)
**Say:**
> "Now I'll extract tasks. The AI identifies action items, assignees, priorities, and due dates automatically."

**Do:**
- Click "Extract Tasks" button (or press Ctrl+Enter)
- Show the loading spinner
- Wait for success message: "Extracted X tasks"
- Automatically redirected to preview page

---

### Step 4: Preview & Edit (25 seconds)
**Say:**
> "Here's the preview. I can review each task, edit details, adjust priorities, or remove tasks I don't need."

**Do:**
- Scroll through the task list
- Click the pencil icon on one task to show inline editing
- Change the priority dropdown (medium → high)
- Click the checkmark to save
- Click the trash icon to remove a task
- Show the remaining tasks

---

### Step 5: Create in Zoho (15 seconds)
**Say:**
> "When I'm happy with the tasks, I click Create in Zoho Projects, and they're instantly added to my project."

**Do:**
- Click "Create in Zoho Projects" button
- Wait for success message
- Show the green checkmarks with task links
- Click one "View in Zoho →" link to show fake Zoho URL (mock mode)

---

### Step 6: Recap (5 seconds)
**Say:**
> "That's it! From meeting notes to Zoho tasks in seconds. No manual entry, no missed action items."

**Do:**
- Return to home page
- Show Dashboard (optional)

---

## Key Points to Emphasize

### Pain Point
"Manually creating tasks from meeting notes is tedious and error-prone."

### Solution
"MeetingMind automates this with AI—just paste and go."

### Benefits
- ⚡ **Fast**: Seconds instead of minutes
- 🎯 **Accurate**: AI catches everything, even implied tasks
- 🔗 **Integrated**: Direct Zoho Projects connection
- ✨ **Simple**: No training required, intuitive UI

---

## Demo Variations

### For Technical Audience
Add these points:
- "Uses OpenAI/Claude/Gemini for extraction"
- "Mock mode for demos, real AI for production"
- "Built with React + TypeScript + Express"
- "Deployable to Heroku/Render in minutes"

### For Business Audience
Add these points:
- "Saves 5-10 minutes per meeting"
- "Ensures no action items are forgotten"
- "Works with existing Zoho Projects workflow"
- "Can integrate with Zoho Cliq for slash commands"

---

## Common Questions (Be Prepared)

**Q: Does it work with other project management tools?**
A: Currently optimized for Zoho Projects, but the architecture supports adding other integrations (Jira, Asana, etc.).

**Q: What if the AI makes mistakes?**
A: That's why we have the preview step—you can edit any task before creating it in Zoho.

**Q: How much does the AI cost?**
A: Approximately $0.01-$0.03 per extraction with GPT-4, or $0.001 with GPT-3.5. Mock mode is free for demos.

**Q: Can it handle voice transcripts?**
A: Yes! Just paste the transcript from Zoom, Teams, or any transcription service.

**Q: Is it secure?**
A: Yes. We use OAuth for Zoho, never store passwords, and all API keys stay on the backend.

---

## Backup Demo (If Something Breaks)

If the backend is down or not responding:

1. **Explain:** "This is running in mock mode right now, but in production it uses real AI."
2. **Show the code:** Open the mockExtractor.ts file to show the pattern matching logic
3. **Walk through the UI manually:** Show each page even if API calls fail
4. **Fallback to architecture:** Show the README.md with the architecture diagram

---

## Post-Demo Next Steps

After the demo, offer:

1. **GitHub repo access:** "I can share the code if you want to try it."
2. **Custom deployment:** "We can deploy this to your Zoho instance."
3. **Additional features:** "We're working on Cliq integration and recurring task detection."
4. **Live walkthrough:** "I can set up a call to configure it for your team."

---

## Troubleshooting

### Issue: Frontend won't load
- Check that `npm run dev` is running in frontend folder
- Visit http://localhost:3000 directly
- Check browser console for errors

### Issue: Backend not responding
- Check that `npm run dev` is running in backend folder
- Visit http://localhost:5000/health to verify
- Check `.env` file has `USE_MOCK=true`

### Issue: Tasks not extracting
- Make sure notes have bullet points or keywords (TODO, ACTION, etc.)
- Try the "Load sample notes" button
- Check backend terminal for errors

### Issue: Create in Zoho fails
- This is expected in mock mode—it returns fake URLs
- Point out: "In production, these would be real Zoho task links"
- Show the mock response in Network tab

---

## Advanced Demo: Zoho Cliq Integration (Optional)

If you want to show the Cliq webhook:

1. Open http://localhost:5000/api/cliq/webhook in Postman
2. POST with body:
   ```json
   {
     "text": "- John to review PR\n- Sarah will update docs"
   }
   ```
3. Show the formatted card response
4. Explain: "This is what users see in Cliq chat when they type /meetingmind"

---

## Demo Checklist

Before presenting:

- [ ] Both servers running (frontend + backend)
- [ ] Browser cleared of old session data
- [ ] Sample notes button works
- [ ] All 3 pages load (PasteNotes, PreviewTasks, Dashboard)
- [ ] Backend health check responds: http://localhost:5000/health
- [ ] Frontend proxy works: check Network tab
- [ ] Backup plan ready (show code if demo breaks)

---

**Estimated total time:** 90 seconds  
**Recommended practice runs:** 3-5 times before presenting  
**Best audience size:** 1-20 people (larger groups need screen sharing)
