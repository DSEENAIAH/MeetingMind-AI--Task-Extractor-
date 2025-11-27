// Quick test: Call the backend API directly
const TRANSCRIPT = `Meeting: Product Update Weekly
Date: Feb 12, 2025

00:00:02 — Sarah (Project Manager)

Alright, good morning everyone. We'll get started in just a second.

00:00:20 — Mia

Yes. So the new layout for the analytics card is done. I've uploaded the Figma file yesterday. The only part pending is the mobile layout, which I'll finish today.

00:00:51 — Daniel

Yeah, I can start tomorrow morning. Should take about two days if everything aligns with the existing components.

00:01:00 — Sarah

Alright, so let's target Friday, Feb 14 for completion.

00:01:16 — Auto-transcript note: Speaker unidentified

Uh, yeah that's me — Raj. The API is almost done. The only thing left is authentication caching. I'll push the code by evening.

00:01:32 — Raj

Yes, QA can start tomorrow afternoon.

00:01:42 — Olivia (QA Lead)

We tested the last sprint's features. Two bugs remain — one in the settings page and one with the notification toggle. Daniel, I assigned them to you.

00:01:54 — Daniel

Yep, saw them. I'll fix those today.

00:02:10 — Sarah

We're planning beta release on Feb 20. That means all tasks for this sprint must close by Feb 17. Anyone see issues with this?`;

async function testAPI() {
  console.log('Testing backend API extraction...\n');
  
  const response = await fetch('http://localhost:5000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: TRANSCRIPT })
  });
  
  const data = await response.json();
  
  console.log('Status:', response.status);
  console.log('Tasks extracted:', data.tasks.length);
  console.log('\nTasks:');
  data.tasks.forEach((task, idx) => {
    console.log(`${idx + 1}. ${task.title}`);
    console.log(`   Assignee: ${task.assignee || 'None'}`);
    console.log(`   Due: ${task.dueDate || 'None'}`);
  });
}

testAPI().catch(console.error);
