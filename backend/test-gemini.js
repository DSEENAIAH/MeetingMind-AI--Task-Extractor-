// Quick test to check if Gemini API is working
const GEMINI_API_KEY = 'AIzaSyA_MlKaXX9z-DC-aJ5zltSyYbHZPD-DVPc';

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract tasks from this meeting: "Sam, could you review the onboarding checklist by Friday?" Return JSON: {"tasks": [{"title": "task name", "assignee": "person", "dueDate": "2025-03-14"}]}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Success! Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGemini();