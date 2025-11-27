import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testGeminiRaw() {
  console.log('Testing Gemini API with raw fetch...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say hello in JSON format: {"message": "..."}'
            }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API Key works!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ API Error:', response.status);
      console.error('Details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testGeminiRaw();
