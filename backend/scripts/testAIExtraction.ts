/**
 * Test script for AI-powered task extraction
 * Usage: npx tsx scripts/testAIExtraction.ts
 */

import dotenv from 'dotenv';
import { extractTasksWithAI } from '../src/lib/aiExtractor.js';

// Load environment variables FIRST
dotenv.config();

const SAMPLE_TRANSCRIPT = `
Alright, good morning everyone. Let's kick off our sprint planning meeting. 
Mia said: I've been working on the mobile layout for the dashboard and should be able to finish it by end of day today. 
Daniel mentioned: I'll complete the frontend integration with the new API endpoints by February 14th. That's our target for beta testing.
The QA team confirmed they would start comprehensive testing tomorrow morning.
Daniel also noted two bugs remain in production - the settings page crash and the notification toggle not working. He'll fix both today.
Sarah asked about the timeline. The team agreed to close all sprint tasks by February 17th to meet our milestone.
Raj said the only thing left on his plate is optimizing the authentication caching on the backend, should wrap that up by tomorrow.
Everyone confirmed beta release readiness for February 20th. That's our hard deadline for the stakeholder demo.
Great, let's make it happen. Thanks everyone!
`;

async function testExtraction() {
  console.log('Testing AI-powered task extraction...\n');
  console.log('Transcript length:', SAMPLE_TRANSCRIPT.length, 'characters');
  console.log('Using API key:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const result = await extractTasksWithAI(SAMPLE_TRANSCRIPT);

    console.log('✅ Extraction successful!\n');
    console.log('📊 Metadata:');
    console.log('  - Model:', result.metadata.model);
    console.log('  - Tokens used:', result.metadata.totalTokens);
    console.log('  - Processed at:', result.metadata.processedAt);
    console.log('  - Tasks extracted:', result.tasks.length);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('📋 Extracted Tasks:\n');
    result.tasks.forEach((task, idx) => {
      console.log(`${idx + 1}. ${task.title}`);
      console.log(`   Assignee: ${task.assignee || 'Unassigned'}`);
      console.log(`   Due: ${task.dueDate || 'No deadline'}`);
      console.log(`   Priority: ${task.priority || 'medium'}`);
      console.log(`   Confidence: ${((task.confidence || 0) * 100).toFixed(0)}%`);
      console.log(`   Tags: ${task.tags?.join(', ') || 'None'}`);
      console.log(`   Description: ${task.description}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✨ Test complete!');
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

testExtraction();
