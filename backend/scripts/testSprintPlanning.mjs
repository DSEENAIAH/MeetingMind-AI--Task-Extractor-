const TRANSCRIPT = `Meeting: Sprint Planning – Week 6
Date: Mar 4, 2025
Duration: ~10 minutes (simulated)
Note: Automatically generated transcript.

00:00:04 — Jenna (Scrum Master)

Alright everyone, let's begin. Today we're planning tasks for Sprint 6.

00:00:10 — Mark (Backend Developer)

Morning.

00:00:12 — Eva (Frontend Developer)

Good morning.

00:00:15 — Leo (QA)

Hi, I'm here.

00:00:18 — Jenna

First, the authentication module updates. Mark, what's the status?

00:00:23 — Mark

The token refresh feature is done. I still need to implement rate limiting. Should take one more day.

00:00:32 — Jenna

Okay, please complete that by March 5.

00:00:36 — Mark

Yes, will do.

00:00:38 — Jenna

Eva, frontend tasks — any pending items from last sprint?

00:00:44 — Eva

Yes, the profile page redesign is 80% done. I'll finish the remaining UI today.
The new dropdown component also needs review.

00:00:56 — Jenna

Alright. Please complete profile UI by today and dropdown by March 6.

00:01:03 — Eva

Okay, noted.

00:01:06 — Jenna

Leo, QA updates?

00:01:09 — Leo

We found three bugs in the notifications module — sound alert not firing, duplicate list items, and incorrect timestamps.
I've logged all three.

00:01:23 — Eva

I can take the timestamp one. That's probably a timezone formatting issue.

00:01:29 — Mark

I'll fix the duplicate items. That's backend.

00:01:33 — Leo

Great. The sound alert is likely UI, so that remains unassigned.

00:01:40 — Jenna

Eva, can you take the sound alert bug too?

00:01:43 — Eva

Yes, I can handle it.

00:01:47 — Jenna

Next, new sprint features. We need to start the "Favorites" feature — allowing users to mark items.
Eva, you'll handle UI components.
Mark, handle backend endpoints.

00:02:00 — Mark

Sure, I'll start backend on March 6.

00:02:03 — Eva

UI mockups by March 7.

00:02:06 — Jenna

QA will test both items starting March 10, correct?

00:02:11 — Leo

Yes, that works.

00:02:14 — Jenna

Alright, quick recap:

Mark: Rate limiting by Mar 5, backend for Favorites on Mar 6

Eva: Profile UI today, dropdown by Mar 6, two bug fixes, Favorites UI by Mar 7

Leo: Bug retesting + Favorites testing starting Mar 10

00:02:34 — Mark

All clear.

00:02:36 — Eva

Looks good.

00:02:38 — Leo

Yep, fine for QA.

00:02:40 — Jenna

Okay, thanks everyone. Ending the call. Have a productive sprint.

**00:02:44 — Meeting Ended

Recording stopped.`;

async function test() {
  const response = await fetch('http://localhost:5000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: TRANSCRIPT })
  });
  
  const data = await response.json();
  
  console.log('=== SPRINT PLANNING TRANSCRIPT ===');
  console.log('Total tasks extracted:', data.tasks.length);
  console.log('\nTasks breakdown:\n');
  data.tasks.forEach((task, idx) => {
    console.log(`${idx + 1}. ${task.title}`);
    console.log(`   Assignee: ${task.assignee || 'Unassigned'}`);
    console.log(`   Due: ${task.dueDate || 'No date'}`);
    console.log('');
  });
  
  console.log('\n=== EXPECTED TASKS (Manual Count) ===');
  console.log('1. Implement rate limiting (Mark, Mar 5)');
  console.log('2. Finish profile UI (Eva, today/Mar 4)');
  console.log('3. Complete dropdown component (Eva, Mar 6)');
  console.log('4. Fix timestamp bug (Eva, no date)');
  console.log('5. Fix duplicate items bug (Mark, no date)');
  console.log('6. Fix sound alert bug (Eva, no date)');
  console.log('7. Backend for Favorites (Mark, Mar 6)');
  console.log('8. UI mockups for Favorites (Eva, Mar 7)');
  console.log('9. QA testing for Favorites (Leo, Mar 10)');
  console.log('\nExpected: 9 tasks');
}

test().catch(console.error);
