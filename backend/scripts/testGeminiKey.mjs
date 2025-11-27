import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

console.log('Testing Gemini API Key...');
console.log('API Key present:', apiKey ? 'Yes' : 'No');
console.log('API Key length:', apiKey?.length || 0);

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey || '');
    
    // Try different model names
    const modelNames = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.0-pro'
    ];
    
    for (const modelName of modelNames) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Say "API works!" in JSON format: {"message": "..."}');
        const response = await result.response;
        const text = response.text();
        
        console.log(`\n✅ Success with ${modelName}!`);
        console.log('Response:', text);
        return;
      } catch (err) {
        console.log(`❌ ${modelName} failed:`, err.message);
      }
    }
    
    throw new Error('All model variants failed');
    
  } catch (error) {
    console.error('\n❌ Gemini API Error:');
    console.error('Message:', error.message);
    process.exit(1);
  }
}

testGemini();
