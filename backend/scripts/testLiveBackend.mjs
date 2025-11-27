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

async function testBackend() {
  try {
    const response = await fetch('http://localhost:5000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: SPRINT_PLANNING })
    });
    
    const data = await response.json();
    console.log('\n=== BACKEND API RESPONSE ===');
    console.log('Tasks extracted:', data.tasks.length);
    console.log('\nTasks:');
    data.tasks.forEach((t, i) => {
      console.log(`${i+1}. ${t.title} | ${t.assignee || 'None'} | ${t.dueDate || 'No date'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBackend();
