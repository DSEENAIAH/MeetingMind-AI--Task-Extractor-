import fetch from 'node-fetch';

const FULL_TRANSCRIPT = `Meeting: Product Update Weekly
Date: Feb 12, 2025
Duration: ~12 minutes (simulated)
Note: Automatically generated and may contain errors.

00:00:02 — Sarah (Project Manager)

Alright, good morning everyone. We'll get started in just a second.

00:00:07 — Daniel (Developer)

Morning.

00:00:09 — Mia (Designer)

Hi, I'm here.

00:00:12 — Sarah

Okay great. First topic is the dashboard redesign progress. Mia, can you give us a quick update?

00:00:20 — Mia

Yes. So the new layout for the analytics card is done. I've uploaded the Figma file yesterday. The only part pending is the mobile layout, which I'll finish today.

00:00:33 — Sarah

Okay perfect. And did you get feedback from the stakeholders?

00:00:38 — Mia

Yes, Jason reviewed it and said it's good. Just minor spacing adjustments.

00:00:45 — Sarah

Great. Daniel, once the design is final today, can you start the frontend integration?

00:00:51 — Daniel

Yeah, I can start tomorrow morning. Should take about two days if everything aligns with the existing components.

00:01:00 — Sarah

Alright, so let's target Friday, Feb 14 for completion.

00:01:06 — Daniel

Yeah, that works.

00:01:10 — Sarah

Next item is backend API for user metrics. Raj, any updates?

00:01:16 — Auto-transcript note: Speaker unidentified

Uh, yeah that's me — Raj. The API is almost done. The only thing left is authentication caching. I'll push the code by evening.

00:01:29 — Sarah

Perfect. Is testing possible tomorrow?

00:01:32 — Raj

Yes, QA can start tomorrow afternoon.

00:01:38 — Sarah

Okay, moving on. QA updates. Olivia?

00:01:42 — Olivia (QA Lead)

We tested the last sprint's features. Two bugs remain — one in the settings page and one with the notification toggle. Daniel, I assigned them to you.

00:01:54 — Daniel

Yep, saw them. I'll fix those today.

00:01:58 — Sarah

Great. Anything blocking QA?

00:02:02 — Olivia

No blockers.

00:02:05 — Sarah

Alright. Final topic — release timeline.

00:02:10 — Sarah

We're planning beta release on Feb 20. That means all tasks for this sprint must close by Feb 17. Anyone see issues with this?

00:02:20 — Daniel

No issues from dev side.

00:02:23 — Mia

Design is on track.

00:02:25 — Olivia

QA is fine with timeline.

00:02:28 — Raj

Backend is good too.

00:02:31 — Sarah

Perfect. Quick recap…
Murmur / background noise detected.

00:02:35 — Sarah

So designs final today, frontend integration by 14th, backend ready today, QA testing from tomorrow, and release target is Feb 20.

00:02:48 — Daniel

Sounds good.

00:02:50 — Mia

All good.

00:02:52 — Raj

Yep.

00:02:54 — Sarah

Okay, thanks everyone. That's it for today's meeting. Have a good day.

00:02:58 — Olivia

Bye.

**00:03:00 — Meeting Ended

Recording stopped.`;

async function testLiveBackend() {
  console.log('Testing LIVE backend server with full transcript...\n');
  console.log('Transcript length:', FULL_TRANSCRIPT.length);
  
  const response = await fetch('http://localhost:5000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: FULL_TRANSCRIPT })
  });
  
  const data = await response.json();
  
  console.log('\n=== LIVE BACKEND RESULT ===');
  console.log('Tasks extracted:', data.tasks.length);
  console.log('\nTasks:');
  data.tasks.forEach((task, idx) => {
    console.log(`${idx + 1}. ${task.title}`);
  });
}

testLiveBackend().catch(console.error);
