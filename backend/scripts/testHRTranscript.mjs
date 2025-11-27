const TRANSCRIPT = `Date: March 18, 2025\nDuration: ~12 minutes (simulated)\nParticipants:\n\nKaren (HR Manager)\n\nDavid (Engineering Manager)\n\nSam (Software Engineer)\n\nLina (UI/UX Designer)\n\n00:00:03 — Karen (HR Manager)\n\nGood morning everyone, thanks for joining. Today’s sync is to review engineering workload updates, onboarding improvements, and a few HR-program adjustments.\n\n00:00:12 — David (Engineering Manager)\n\nMorning everyone.\n\n00:00:14 — Sam (Engineer)\n\nHi all.\n\n00:00:16 — Lina (Designer)\n\nHello!\n\n00:00:18 — Karen\n\nLet’s begin with the onboarding experience review. We got feedback from the two new engineers who joined last month — they said the documentation helped but some parts of the setup instructions were outdated.\n\n00:00:32 — David\n\nYeah, I heard the same. Some configuration steps changed after the last backend update.\n\n00:00:40 — Karen\n\nOkay.\nSam, can you update the development environment setup guide by Thursday?\n\n00:00:46 — Sam\n\nYes, I’ll handle that. Shouldn’t take long.\n\n00:00:50 — Karen\n\nNext point: the UI handoff workflow. Some teams mentioned delays in receiving design specs last sprint.\n\n00:00:58 — Lina (Designer)\n\nYes, that happened because we switched to Figma components and were reorganizing files. Everything is sorted now.\n\n00:01:10 — Karen\n\nPerfect.\nLina, please upload the finalized component library to the shared design folder today.\n\n00:01:17 — Lina\n\nSure, I’ll do that after this call.\n\n00:01:20 — David\n\nOn the engineering side, we’re planning to start the new Release Notes Automation Tool next week. But before that, we need the list of all APIs currently being used.\n\n00:01:32 — Sam\n\nRight. I have half the list ready.\n\n00:01:36 — David\n\nGreat.\nSam, please complete the full API usage list and send it to me by Monday.\n\n00:01:43 — Sam\n\nGot it.\n\n00:01:46 — Karen\n\nAnother item from HR: the company is preparing for the quarterly training cycle. We need engineering to confirm which topics the team wants.\n\n00:01:56 — David\n\nYeah, last time the team asked for stress-testing workshops and backend microservices updates.\n\n00:02:04 — Karen\n\nOkay.\nDavid, can you compile the training topic preferences from your team by Friday?\n\n00:02:10 — David\n\nSure, I’ll gather the responses.\n\n00:02:14 — Lina\n\nOne thing from design: I want to align with engineering about the new dashboard color scales.\n\n00:02:20 — David\n\nYes, let’s sync on that.\n\n00:02:22 — Karen\n\nWe can make it an action item.\nLina and David, schedule a design–engineering alignment meeting for next Tuesday.\n\n00:02:30 — Lina\n\nWill do.\n\n00:02:31 — David\n\nI’ll block a slot.\n\n00:02:33 — Karen\n\nBefore we close, last item: performance review cycle reminders go out next week.\nEveryone, please review your self-assessment drafts before Monday.\n\n00:02:45 — Sam\n\nNoted.\n\n00:02:46 — Lina\n\nOkay.\n\n00:02:47 — David\n\nWill do.\n\n00:02:49 — Karen\n\nThat covers everything. Thanks for joining and have a productive day.\n\n00:02:53 — Lina\n\nThank you!\n\n00:02:54 — Sam\n\nBye.\n\n00:02:56 — David\n\nSee you all.\n\n00:02:58 — Meeting Ended\n\nRecording stopped.`;

async function run() {
  const resp = await fetch('http://localhost:5000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: TRANSCRIPT })
  });
  const data = await resp.json();
  console.log('\n=== HR TRANSCRIPT EXTRACTION RESULT ===');
  console.log('Total tasks:', data.tasks.length);
  data.tasks.forEach((t, i) => {
    console.log(`${i+1}. ${t.title} | Assignee: ${t.assignee || 'None'} | Due: ${t.dueDate || 'None'} | Priority: ${t.priority}`);
  });
  console.log('\nExpected actionable items (for comparison):');
  console.log('- Update dev environment setup guide (Sam, Thu)');
  console.log('- Upload finalized component library (Lina, Today)');
  console.log('- Complete full API usage list (Sam, Monday)');
  console.log('- Compile training topic preferences (David, Friday)');
  console.log('- Schedule alignment meeting (Lina & David, next Tuesday)');
  console.log('- Review self-assessment drafts (All, Monday)');
}

run().catch(e => console.error('Error calling backend:', e));
