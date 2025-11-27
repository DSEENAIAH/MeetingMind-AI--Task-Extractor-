import { extractTasksMock } from '../src/lib/newExtractor.js';

const SPRINT = `00:00:20 — Mark
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
Alright. Leo, QA testing starting March 10?`;

const result = extractTasksMock(SPRINT);

console.log('\nExtracted tasks:');
result.tasks.forEach((t, i) => {
  console.log(`${i+1}. ${t.title} | ${t.assignee || 'None'} | ${t.dueDate || 'No date'}`);
});

console.log('\n\nEXPECTED:');
console.log('1. Finish profile page redesign | Eva | today');
console.log('2. Complete settings dropdown | Eva | Mar 5');
console.log('3. Implement API rate limiting | Mark | Mar 6');
console.log('4. Fix timestamp bug | Eva | None');
console.log('5. Fix duplicate items | Mark | None');
console.log('6. Fix sound alert | Eva | None');
console.log('7. Backend API for Favorites | Mark | Mar 6');
console.log('8. UI for Favorites | Eva | Mar 7');
console.log('9. QA testing | Leo | Mar 10');
