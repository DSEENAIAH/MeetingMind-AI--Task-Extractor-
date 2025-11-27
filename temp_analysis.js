// Quick analysis of meeting transcript
const meetingNotes = `[00:02] Manager (Ravi): Good morning team. Let's quickly sync up on the mobile app release.  
[00:10] Neha: Morning! So yesterday I checked the crash logs. The login crash still happens for around 3% of users.  
[00:18] Ravi: Yeah, that's higher than expected.  
[00:22] Seenu: I can look into the login crash issue today and push a fix before evening.  
[00:30] Ravi: Perfect. Neha, after Seenu's fix goes in, can you run a round of regression testing on the authentication module?  
[00:38] Neha: Yep, I'll run regression tests once the fix is merged.  
[00:45] Ravi: Great. Also, we need updated screenshots for the app store listing. The current ones are outdated.  
[00:53] Priya: I can handle the new screenshots. I'll redesign and update all of them by tomorrow afternoon.  
[01:00] Ravi: Nice. Next, who's updating the release notes? They still show last month's version.  
[01:05] Arjun: I'll update the release notes after our meeting. Should take 20 minutes.  
[01:12] Ravi: Awesome. And before we wrap — the server team wants a short performance report from our end.  
[01:18] Neha: I can create that. Need it by today?  
[01:20] Ravi: End of day is fine. Just a one-pager.  
[01:25] Ravi: That's it. Thanks team!`;

// Extract tasks manually by identifying action items
const tasks = [];

// 1. Seenu: look into login crash issue today and push fix before evening
tasks.push({
  assignee: "Seenu",
  task: "look into the login crash issue today and push a fix before evening",
  dueDate: "today/evening"
});

// 2. Neha: run regression testing on authentication module after fix
tasks.push({
  assignee: "Neha", 
  task: "run a round of regression testing on the authentication module",
  dueDate: "after Seenu's fix is merged"
});

// 3. Priya: handle new screenshots, redesign and update all by tomorrow afternoon
tasks.push({
  assignee: "Priya",
  task: "handle the new screenshots - redesign and update all of them",
  dueDate: "by tomorrow afternoon"
});

// 4. Arjun: update release notes after meeting
tasks.push({
  assignee: "Arjun",
  task: "update the release notes",
  dueDate: "after our meeting (20 minutes)"
});

// 5. Neha: create performance report for server team
tasks.push({
  assignee: "Neha",
  task: "create a short performance report from our end",
  dueDate: "end of day (one-pager)"
});

console.log(`Total tasks found: ${tasks.length}`);
console.log('\nTasks breakdown:');
tasks.forEach((task, i) => {
  console.log(`${i+1}. ${task.assignee}: ${task.task} (${task.dueDate})`);
});