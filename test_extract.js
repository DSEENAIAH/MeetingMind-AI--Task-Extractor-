// Quick test script to verify backend mock extraction
const testNotes = `Team Standup Meeting Transcript - November 24, 2025

Attendees: John, Sarah, Mike, Ramya, Lisa

Discussion:

Ramya, this is your task - finish the quarterly report by 10pm today

John mentioned he'll review PR #234 tomorrow morning

Sarah said she needs to update the API documentation by Friday

We told Mike to fix that urgent login bug ASAP - it's blocking QA testing

Lisa will handle the client demo and needs to prepare slides by end of week

Manager: "Also, someone should schedule a follow-up meeting with the design team"

John: "I'll take care of deploying the hotfix to production by EOD"

Sarah: "I can work on updating the project timeline in Zoho Projects"

Action items discussed:
- Code review completion needed urgently
- Documentation updates are high priority
- Bug fixes required before release
- Client feedback needs follow-up

Next standup: Tomorrow 9 AM`;

fetch('http://localhost:5000/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes: testNotes, useMock: true })
})
.then(res => res.json())
.then(data => {
  console.log('Extracted tasks:', data.tasks.length);
  data.tasks.forEach((task, i) => {
    console.log(`${i+1}. ${task.title} (${task.assignee || 'Unassigned'})`);
  });
})
.catch(err => console.error('Error:', err));