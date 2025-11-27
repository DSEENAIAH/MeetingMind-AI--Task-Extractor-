import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  console.log('Fetching available Gemini models...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API Key is valid!\n');
      console.log('Available models:');
      
      if (data.models) {
        data.models.forEach(model => {
          console.log(`- ${model.name} (${model.displayName})`);
          if (model.supportedGenerationMethods?.includes('generateContent')) {
            console.log('  ✓ Supports generateContent');
          }
        });
      } else {
        console.log('No models found in response');
      }
    } else {
      console.error('❌ API Error:', response.status);
      console.error('Details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

listModels();
