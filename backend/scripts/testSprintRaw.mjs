import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const transcript = `Meeting: Sprint Planning – Week 6
Date: Mar 4, 2025

00:00:23 — Mark: The token refresh feature is done. I still need to implement rate limiting. Should take one more day.

00:00:32 — Jenna: Okay, please complete that by March 5.

00:00:36 — Mark: Yes, will do.

00:00:44 — Eva: Yes, the profile page redesign is 80% done. I'll finish the remaining UI today. The new dropdown component also needs review.

00:00:56 — Jenna: Alright. Please complete profile UI by today and dropdown by March 6.

00:01:23 — Eva: I can take the timestamp one. That's probably a timezone formatting issue.

00:01:29 — Mark: I'll fix the duplicate items. That's backend.

00:01:40 — Jenna: Eva, can you take the sound alert bug too?

00:01:43 — Eva: Yes.

00:02:10 — Mark: I can handle the Favorites backend logic by March 6.

00:02:17 — Eva: I'll have the UI mockups for Favorites ready by March 7.

00:02:25 — Leo: Okay, so I'll test both items starting March 10, correct?`;

const EXTRACTION_PROMPT = `You are an expert at extracting actionable tasks from meeting notes and transcripts.

Analyze the meeting content and extract ALL actionable tasks, assignments, and deliverables. Look for:
- Direct assignments ("John to review PR", "Sarah will update docs", "Sam, can you X")
- Commitments ("I'll handle the screenshots", "I can fix that bug", "I'll do that")
- Deadlines and time-sensitive items ("by Thursday", "today", "before Monday")
- Follow-up actions and next steps ("schedule a meeting", "send the report")
- Bug fixes, feature requests, and deliverables
- Group assignments ("Everyone, please X", "Team needs to Y")

IMPORTANT - Extract EVERY task mentioned, even if:
- It seems small or routine
- Multiple people are assigned
- No specific deadline is mentioned
- It's phrased as a question ("can you X?")

For each task, provide:
- title: Clear, actionable description (what needs to be done) - keep it concise, remove filler words
- description: Brief context from the meeting
- assignee: Person responsible (first name only, capitalize). If multiple people, use "Name1 and Name2". If everyone, use "Everyone"
- priority: "high" for urgent/critical items with today/ASAP deadlines, "medium" for normal tasks, "low" for future/optional
- dueDate: YYYY-MM-DD format if deadline mentioned (convert "today"→actual date, "tomorrow"→next day, "Thursday"→next Thursday, "Monday"→next Monday)

Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON in this exact format:
{
  "tasks": [
    {
      "title": "Update development environment setup guide",
      "description": "Extracted from meeting transcript",
      "assignee": "Sam",
      "priority": "medium",
      "dueDate": "2025-11-28"
    }
  ]
}

Meeting content:`;

async function test() {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(EXTRACTION_PROMPT + '\n' + transcript);
  const text = result.response.text();
  
  console.log('\n=== RAW GEMINI RESPONSE ===');
  console.log(text);
  console.log('=== END ===\n');
  
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const parsed = JSON.parse(jsonText);
  console.log('\nParsed tasks:', parsed.tasks.length);
  parsed.tasks.forEach((t, i) => {
    console.log(`${i+1}. ${t.title} | ${t.assignee} | ${t.dueDate || 'No date'}`);
  });
}

test().catch(e => console.error('Error:', e));
