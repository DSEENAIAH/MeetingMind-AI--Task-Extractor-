/**
 * Quick test script for Gemini integration
 */

import { extractTasksWithGemini } from './src/lib/llmClient.js';

const testNotes = `
look into the login crash issue today and push a fix before evening
Extracted from meeting transcript

handle the new screenshots. I'll redesign and update all of them by tomorrow afternoon
Extracted from meeting transcript

create that. Need it by today?
Extracted from meeting transcript
`;

async function testGemini() {
  try {
    console.log('Testing Gemini extraction...');
    const result = await extractTasksWithGemini(testNotes);
    console.log('Success!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGemini();