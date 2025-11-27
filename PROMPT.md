# MeetingMind AI - LLM Prompt Guide

This document contains the exact prompts used to extract tasks from meeting notes using AI models (OpenAI, Claude, Gemini, etc.).

---

## Core Extraction Prompt

### System Prompt

```
You are an expert task extraction assistant. Your job is to analyze meeting notes and extract actionable tasks with structured information.

Extract tasks that are:
- Explicit action items (TODO, ACTION, will do, needs to, etc.)
- Assigned to specific people or teams
- Have clear deliverables or outcomes

For each task, identify:
1. Title: Brief, actionable description (imperative form preferred)
2. Description: Additional context or details
3. Assignee: Person responsible (if mentioned)
4. Priority: low, medium, or high (infer from keywords like urgent, ASAP, critical)
5. Due date: In ISO 8601 format (YYYY-MM-DD) if mentioned

Return ONLY valid JSON. No explanations, no markdown, just JSON.
```

### User Prompt Template

```
Extract tasks from these meeting notes:

"""
{MEETING_NOTES}
"""

Return a JSON array of tasks with this structure:
{
  "tasks": [
    {
      "title": "string (required)",
      "description": "string (required)",
      "assignee": "string (optional)",
      "priority": "low" | "medium" | "high" (optional, default: medium)",
      "dueDate": "YYYY-MM-DD (optional)"
    }
  ]
}
```

---

## Example 1: Simple Meeting Notes

**Input:**
```
Team Standup - Nov 24, 2025

- John to review PR #234 by EOD
- Sarah will update the API documentation
- Mike needs to fix the login bug (urgent)
- TODO: Schedule design review meeting
```

**Expected Output:**
```json
{
  "tasks": [
    {
      "title": "Review PR #234",
      "description": "Code review for pull request #234",
      "assignee": "John",
      "priority": "medium",
      "dueDate": "2025-11-24"
    },
    {
      "title": "Update API documentation",
      "description": "Update documentation for API endpoints",
      "assignee": "Sarah",
      "priority": "medium"
    },
    {
      "title": "Fix login bug",
      "description": "Debug and fix the login authentication issue",
      "assignee": "Mike",
      "priority": "high"
    },
    {
      "title": "Schedule design review meeting",
      "description": "Coordinate and schedule a design review session",
      "priority": "medium"
    }
  ]
}
```

---

## Example 2: Detailed Project Meeting

**Input:**
```
Product Planning Meeting
November 24, 2025

Attendees: Sarah (PM), Mike (Dev), Lisa (Design), Tom (QA)

Discussion Points:
1. New dashboard feature requirements
   - Lisa will create wireframes by Friday
   - Mike mentioned the backend API needs updates (high priority)
   
2. Bug fixes for v2.1 release
   - Tom found 3 critical bugs in staging
   - ACTION: Mike to investigate database query performance ASAP
   - Sarah should update the release notes

3. User feedback review
   - Lisa needs to analyze survey responses
   - Follow-up meeting next Tuesday to discuss findings

Next meeting: Dec 1, 2025
```

**Expected Output:**
```json
{
  "tasks": [
    {
      "title": "Create dashboard wireframes",
      "description": "Design wireframes for the new dashboard feature",
      "assignee": "Lisa",
      "priority": "medium",
      "dueDate": "2025-11-29"
    },
    {
      "title": "Update backend API",
      "description": "Update API endpoints to support new dashboard requirements",
      "assignee": "Mike",
      "priority": "high"
    },
    {
      "title": "Investigate database query performance",
      "description": "Debug and optimize slow database queries found in staging",
      "assignee": "Mike",
      "priority": "high"
    },
    {
      "title": "Update release notes",
      "description": "Document changes and fixes for v2.1 release",
      "assignee": "Sarah",
      "priority": "medium"
    },
    {
      "title": "Analyze user survey responses",
      "description": "Review and analyze feedback from recent user survey",
      "assignee": "Lisa",
      "priority": "medium"
    },
    {
      "title": "Schedule follow-up meeting",
      "description": "Plan meeting to discuss user feedback findings",
      "priority": "medium",
      "dueDate": "2025-12-02"
    }
  ]
}
```

---

## Example 3: Sprint Planning Notes

**Input:**
```
Sprint Planning - Sprint 23
Date: 2025-11-24

Sprint Goal: Complete user authentication overhaul

Stories:
- US-101: Implement OAuth 2.0 (13 points)
  - Backend work: @john
  - Frontend integration: @sarah
  - Testing: @tom by end of sprint

- US-102: Add password reset flow (5 points)
  - Owner: @sarah
  - CRITICAL: Security review required before merge

- US-103: Update login UI (3 points)
  - Design mockups ready
  - @lisa to implement
  - Low priority, can move to next sprint if needed

Technical Debt:
- Refactor authentication middleware (optional)
- Update dependency versions
```

**Expected Output:**
```json
{
  "tasks": [
    {
      "title": "Implement OAuth 2.0 backend",
      "description": "Backend implementation for OAuth 2.0 authentication (US-101)",
      "assignee": "john",
      "priority": "high",
      "dueDate": "2025-12-08"
    },
    {
      "title": "Integrate OAuth 2.0 frontend",
      "description": "Frontend integration for OAuth 2.0 flow (US-101)",
      "assignee": "sarah",
      "priority": "high",
      "dueDate": "2025-12-08"
    },
    {
      "title": "Test OAuth 2.0 implementation",
      "description": "Complete testing for OAuth 2.0 feature (US-101)",
      "assignee": "tom",
      "priority": "high",
      "dueDate": "2025-12-08"
    },
    {
      "title": "Implement password reset flow",
      "description": "Add password reset functionality with security review (US-102)",
      "assignee": "sarah",
      "priority": "high"
    },
    {
      "title": "Update login UI",
      "description": "Implement new login interface design (US-103)",
      "assignee": "lisa",
      "priority": "low"
    },
    {
      "title": "Refactor authentication middleware",
      "description": "Technical debt: clean up and modernize auth middleware",
      "priority": "low"
    },
    {
      "title": "Update dependency versions",
      "description": "Update npm dependencies to latest stable versions",
      "priority": "low"
    }
  ]
}
```

---

## Best Practices for Prompting

### 1. **Insist on JSON-only output**
Always emphasize "Return ONLY valid JSON" to prevent the model from adding explanations.

### 2. **Provide clear schema**
Show the exact structure you expect, including optional fields.

### 3. **Use few-shot examples**
Include 1-2 examples in the prompt for complex extraction patterns.

### 4. **Handle edge cases**
- Empty notes → Return empty tasks array
- No explicit tasks → Extract implied actions
- Ambiguous assignees → Omit assignee field

### 5. **Validate output**
Always parse and validate the JSON response before using it.

---

## Implementation Notes

### OpenAI (GPT-4 / GPT-3.5)
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: USER_PROMPT }
  ],
  response_format: { type: 'json_object' }, // Enforce JSON
  temperature: 0.3, // Lower = more consistent
});
```

### Anthropic (Claude)
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 2048,
  messages: [
    { role: 'user', content: SYSTEM_PROMPT + '\n\n' + USER_PROMPT }
  ],
  // Note: Claude doesn't have response_format, so be explicit in prompt
});
```

### Google (Gemini)
```typescript
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + USER_PROMPT }] }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: 'application/json',
  },
});
```

---

## Cost Estimation

Approximate costs per extraction (as of Nov 2024):

- **GPT-4 Turbo**: $0.01 - $0.03 per extraction (500-1000 tokens)
- **GPT-3.5 Turbo**: $0.001 - $0.002 per extraction
- **Claude 3 Sonnet**: $0.003 - $0.015 per extraction
- **Gemini Pro**: $0.0005 - $0.002 per extraction

For a demo or low-volume usage, USE_MOCK=true is recommended to avoid costs.

---

## Troubleshooting

### Model returns markdown instead of JSON
**Fix**: Add "Return ONLY valid JSON. No explanations, no markdown, just JSON." to system prompt.

### Extracted tasks are too generic
**Fix**: Emphasize "actionable" and "specific" in the prompt. Provide better examples.

### Missing assignees or dates
**Fix**: The model can't extract what isn't in the notes. Encourage users to write structured notes.

### Hallucinated information
**Fix**: Add "Only extract information explicitly stated in the notes. Do not infer or create information."

---

## Future Enhancements

- [ ] Fine-tune a small model on company-specific meeting formats
- [ ] Add context from previous meetings (RAG / vector database)
- [ ] Support for multi-language notes
- [ ] Classify tasks by category (bug, feature, admin, etc.)
- [ ] Extract dependencies between tasks
- [ ] Suggest missing information (assignee, due date)
