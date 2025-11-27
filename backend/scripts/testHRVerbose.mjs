import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TRANSCRIPT = `Date: March 18, 2025
Duration: ~12 minutes (simulated)
Participants:

Karen (HR Manager)

David (Engineering Manager)

Sam (Software Engineer)

Lina (UI/UX Designer)

00:00:03 — Karen (HR Manager)

Good morning everyone, thanks for joining. Today's sync is to review engineering workload updates, onboarding improvements, and a few HR-program adjustments.

00:00:12 — David (Engineering Manager)

Morning everyone.

00:00:14 — Sam (Engineer)

Hi all.

00:00:16 — Lina (Designer)

Hello!

00:00:18 — Karen

Let's begin with the onboarding experience review. We got feedback from the two new engineers who joined last month — they said the documentation helped but some parts of the setup instructions were outdated.

00:00:32 — David

Yeah, I heard the same. Some configuration steps changed after the last backend update.

00:00:40 — Karen

Okay.
Sam, can you update the development environment setup guide by Thursday?

00:00:46 — Sam

Yes, I'll handle that. Shouldn't take long.

00:00:50 — Karen

Next point: the UI handoff workflow. Some teams mentioned delays in receiving design specs last sprint.

00:00:58 — Lina (Designer)

Yes, that happened because we switched to Figma components and were reorganizing files. Everything is sorted now.

00:01:10 — Karen

Perfect.
Lina, please upload the finalized component library to the shared design folder today.

00:01:17 — Lina

Sure, I'll do that after this call.

00:01:20 — David

On the engineering side, we're planning to start the new Release Notes Automation Tool next week. But before that, we need the list of all APIs currently being used.

00:01:32 — Sam

Right. I have half the list ready.

00:01:36 — David

Great.
Sam, please complete the full API usage list and send it to me by Monday.

00:01:43 — Sam

Got it.

00:01:46 — Karen

Another item from HR: the company is preparing for the quarterly training cycle. We need engineering to confirm which topics the team wants.

00:01:56 — David

Yeah, last time the team asked for stress-testing workshops and backend microservices updates.

00:02:04 — Karen

Okay.
David, can you compile the training topic preferences from your team by Friday?

00:02:10 — David

Sure, I'll gather the responses.

00:02:14 — Lina

One thing from design: I want to align with engineering about the new dashboard color scales.

00:02:20 — David

Yes, let's sync on that.

00:02:22 — Karen

We can make it an action item.
Lina and David, schedule a design–engineering alignment meeting for next Tuesday.

00:02:30 — Lina

Will do.

00:02:31 — David

I'll block a slot.

00:02:33 — Karen

Before we close, last item: performance review cycle reminders go out next week.
Everyone, please review your self-assessment drafts before Monday.

00:02:45 — Sam

Noted.

00:02:46 — Lina

Okay.

00:02:47 — David

Will do.

00:02:49 — Karen

That covers everything. Thanks for joining and have a productive day.

00:02:53 — Lina

Thank you!

00:02:54 — Sam

Bye.

00:02:56 — David

See you all.

00:02:58 — Meeting Ended

Recording stopped.`;

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

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(EXTRACTION_PROMPT + '\n' + TRANSCRIPT);
    const response = result.response;
    const text = response.text();
    
    console.log('\n=== RAW GEMINI RESPONSE ===');
    console.log(text);
    console.log('\n=== END RESPONSE ===\n');
    
    // Try to parse it
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
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();
