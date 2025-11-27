# AI Integration Setup Guide

## Quick Start

**1. Get an AI API Key:**

**Option A: OpenAI (Recommended)**
- Go to https://platform.openai.com/api-keys
- Create account and add payment method
- Generate API key (starts with `sk-`)
- Cost: ~$0.01-0.05 per meeting transcript

**Option B: Anthropic Claude**
- Go to https://console.anthropic.com/
- Create account and get API key (starts with `sk-ant-`)
- Cost: Similar to OpenAI

**Option C: Google Gemini**
- Go to https://aistudio.google.com/app/apikey
- Free tier available with rate limits
- Get API key

**2. Configure Backend:**

Edit `backend/.env`:
```bash
# Change this to false to enable AI
USE_MOCK=false

# Choose your provider
AI_PROVIDER=openai

# Add your API key (uncomment and replace)
OPENAI_API_KEY=sk-your-actual-key-here
```

**3. Restart Backend:**
```bash
cd backend
npm run dev
```

**4. Test:**
- Paste any meeting transcript
- Should now use real AI instead of mock patterns
- Works with any meeting format, any language

## Features

**✅ Universal Support:**
- Sprint planning, standups, client calls, brainstorming
- Any language or communication style
- Implicit and explicit task assignments
- Context-aware priority detection

**✅ Smart Processing:**
- Automatic chunking for long transcripts (>10KB)
- Deduplication of similar tasks
- Rate limiting to avoid API limits
- Fallback to mock if AI fails

**✅ Cost Optimization:**
- Uses cheapest models (GPT-4o-mini, Claude Haiku, Gemini Flash)
- Efficient prompting to minimize tokens
- Chunking only when needed

## Example Results

**Input:** Any meeting transcript
**Output:** Structured tasks with:
- Clear, actionable titles
- Assigned team members
- Due dates (if mentioned)
- Priority levels
- Context from meeting

## Switching Providers

Change `AI_PROVIDER` in `.env`:
```bash
AI_PROVIDER=openai     # GPT-4o-mini
AI_PROVIDER=anthropic  # Claude Haiku  
AI_PROVIDER=gemini     # Gemini Flash
```

## Cost Estimates

- **Short meeting (5-10 min):** $0.01-0.02
- **Long meeting (30-60 min):** $0.05-0.15
- **Daily usage (5 meetings):** $0.25-0.75

## Troubleshooting

**"API key not configured"**
- Check `.env` file has correct key
- Restart backend after changes

**"Rate limit exceeded"**
- Wait a few minutes
- Consider upgrading API plan

**"Extraction failed"**
- App automatically falls back to mock
- Check API key and internet connection

## Production Deployment

For production, set environment variables:
```bash
USE_MOCK=false
AI_PROVIDER=openai
OPENAI_API_KEY=your-production-key
```

The AI integration is production-ready and handles errors gracefully.