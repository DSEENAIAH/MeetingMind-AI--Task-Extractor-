const transcript = `Meeting: Sprint Planning – Week 6
Date: Mar 4, 2025

00:00:23 — Mark

The token refresh feature is done. I still need to implement rate limiting. Should take one more day.

00:00:32 — Jenna

Okay, please complete that by March 5.

00:00:36 — Mark

Yes, will do.

00:00:44 — Eva

Yes, the profile page redesign is 80% done. I'll finish the remaining UI today.
The new dropdown component also needs review.

00:00:56 — Jenna

Alright. Please complete profile UI by today and dropdown by March 6.

00:01:23 — Eva

I can take the timestamp one. That's probably a timezone formatting issue.

00:01:29 — Mark

I'll fix the duplicate items. That's backend.

00:01:40 — Jenna

Eva, can you take the sound alert bug too?

00:01:43 — Eva

Yes.

00:02:10 — Mark

I can handle the Favorites backend logic by March 6.

00:02:17 — Eva

I'll have the UI mockups for Favorites ready by March 7.

00:02:25 — Leo

Okay, so I'll test both items starting March 10, correct?`;

async function test() {
  const response = await fetch('http://localhost:5000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: transcript })
  });
  
  const data = await response.json();
  
  console.log('\n=== SPRINT PLANNING (FRESH TEST) ===');
  console.log('Total tasks:', data.tasks.length);
  data.tasks.forEach((t, i) => {
    console.log(`${i+1}. ${t.title} | ${t.assignee} | ${t.dueDate || 'No date'} | ${t.priority}`);
  });
  console.log('\nExpected: 9 tasks');
  console.log('1. Implement rate limiting (Mark, Mar 5)');
  console.log('2. Finish profile UI (Eva, today)');
  console.log('3. Complete dropdown (Eva, Mar 6)');
  console.log('4. Fix timestamp bug (Eva)');
  console.log('5. Fix duplicate items (Mark)');
  console.log('6. Fix sound alert (Eva)');
  console.log('7. Favorites backend (Mark, Mar 6)');
  console.log('8. UI mockups Favorites (Eva, Mar 7)');
  console.log('9. Test Favorites (Leo, Mar 10)');
}

test().catch(e => console.error(e));
