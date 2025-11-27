import { extractTasksMock } from '../src/lib/newExtractor.js';

const SPRINT_PLANNING = `Meeting: Sprint Planning
Date: March 3, 2025
Duration: 42 minutes

00:00:05 — Mark
Morning, everyone. Let's kick off the sprint. First, the authentication module updates. Eva, status?

00:00:15 — Eva
Almost complete. The JWT refresh logic is solid.

00:00:20 — Mark
Good. Eva, frontend tasks — any pending items?

00:00:25 — Eva
Yes, the profile page redesign is 80% done. I'll finish that today. Also, the settings dropdown needs completion by tomorrow.

00:00:38 — Mark
Okay, please complete that by March 5. Now, the API rate limiting feature — we need it for the public endpoints. I can take that. Will push a PR by March 6.

00:00:55 — Eva
Great. Also, three bugs remain — one's a timestamp issue in the dashboard, another is duplicate items appearing in the history list, and the sound alert isn't working properly.

00:01:10 — Mark
I'll handle the duplicate items bug. Eva, can you take the timestamp and sound alert bugs?

00:01:18 — Eva
Sure, will do.

00:01:20 — Mark
Next, Favorites feature. Backend needs to be done by March 6, and UI by March 7. I need to prep the backend API. Eva, you'll handle the frontend part, right?

00:01:40 — Eva
Yes, I'll start after the profile page is done.

00:01:45 — Mark
Alright. Leo, QA testing starting March 10?

00:01:50 — Leo
Yep, that's the plan. I'll coordinate with the team.

00:01:55 — Mark
Perfect. That's everything. Thanks, all.`;

console.log('Testing Sprint Planning Transcript with NEW Universal Extractor\n');
console.log('='.repeat(80));

const result = extractTasksMock(SPRINT_PLANNING);

console.log(`\nTotal tasks extracted: ${result.tasks.length}`);
console.log('Expected: 9 tasks\n');

console.log('Extracted Tasks:');
console.log('='.repeat(80));

result.tasks.forEach((task, i) => {
  console.log(`\n${i+1}. ${task.title}`);
  console.log(`   Assignee: ${task.assignee || 'None'}`);
  console.log(`   Due Date: ${task.dueDate || 'None'}`);
  console.log(`   Priority: ${task.priority}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nEXPECTED TASKS:');
console.log('1. Implement API rate limiting (Mark, Mar 6)');
console.log('2. Finish profile page redesign (Eva, today)');
console.log('3. Complete settings dropdown (Eva, Mar 5)');
console.log('4. Fix timestamp bug in dashboard (Eva)');
console.log('5. Fix duplicate items in history (Mark)');
console.log('6. Fix sound alert (Eva)');
console.log('7. Backend API for Favorites (Mark, Mar 6)');
console.log('8. UI for Favorites (Eva, Mar 7)');
console.log('9. QA testing (Leo, Mar 10)');
