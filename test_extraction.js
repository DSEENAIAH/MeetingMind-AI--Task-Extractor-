// Test the improved extraction
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

console.log('Meeting transcript analysis:');
console.log('Expected tasks:');
console.log('1. Seenu: look into login crash issue and push fix before evening');
console.log('2. Neha: run regression testing on authentication module');  
console.log('3. Priya: handle new screenshots, redesign and update by tomorrow afternoon');
console.log('4. Arjun: update release notes after meeting');
console.log('5. Neha: create performance report by end of day');
console.log('\nTotal expected: 5 tasks');