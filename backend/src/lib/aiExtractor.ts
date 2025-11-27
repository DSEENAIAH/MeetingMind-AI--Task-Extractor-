/**
 * lib/aiExtractor.ts
 * 
 * Purpose: Real AI-powered task extraction using OpenAI, Claude, or Gemini
 * 
 * Features:
 * - Universal meeting format support
 * - Context-aware task identification
 * - Automatic chunking for long transcripts
 * - Multiple AI provider support
 * - Structured JSON output
 */

import type { ExtractedTask, ExtractResponse } from '../types/index.js';
// Heuristic fallback extractor (universal rules)
import { extractTasksMock as heuristicExtract } from './newExtractor.js';

// ============================================================================
// Configuration
// ============================================================================

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // openai, anthropic, gemini
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MAX_TOKENS = 4000;
const CHUNK_SIZE = 8000; // Characters per chunk for long transcripts
const TASK_MIN = parseInt(process.env.TASK_MIN || '9', 10);
const TASK_MAX = parseInt(process.env.TASK_MAX || '11', 10);

// ============================================================================
// AI Prompts
// ============================================================================

const SYSTEM_PROMPT = `You are an expert at extracting actionable tasks from meeting notes and transcripts.

Your job is to identify concrete, actionable tasks that need to be completed by specific people or teams.

EXTRACT ONLY:
- Specific work assignments ("John will review the PR", "Sarah needs to update docs")
- Action items with deadlines ("Fix the bug by Friday", "Deploy by EOD")
- Deliverables and milestones ("Complete the design mockups", "Finish testing")
- Bug fixes and technical tasks ("Fix the login issue", "Implement rate limiting")

DO NOT EXTRACT:
- Questions or discussions ("What should we do about X?")
- Status updates ("The feature is 80% done")
- General statements ("We should improve performance")
- Meeting logistics ("Let's schedule a follow-up")

For each task, identify:
- Title: Clear, actionable description
- Assignee: Person responsible (if mentioned)
- Due date: Deadline (if mentioned, convert to YYYY-MM-DD format)
- Priority: high (urgent/critical), medium (normal), low (nice-to-have)

Guidelines on quantity:
- If there are more than ${TASK_MAX} distinct actionable tasks, return the top ${TASK_MAX} most important (urgent, with owners/dates, high impact).
- If there are fewer than ${TASK_MIN} tasks total in the entire content, return exactly what is present (do NOT invent tasks).

Return valid JSON only, no other text.`;

const USER_PROMPT = `Extract actionable tasks from this meeting content:

{MEETING_CONTENT}

Return JSON in this exact format:
{
  "tasks": [
    {
      "title": "Clear task description",
      "description": "Context from the meeting",
      "assignee": "Person Name",
      "priority": "high|medium|low",
      "dueDate": "2025-03-05"
    }
  ]
}`;

// ============================================================================
// AI Provider Clients
// ============================================================================

/**
 * OpenAI GPT-4 extraction
 */
async function extractWithOpenAI(content: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cheaper and faster than gpt-4
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT.replace('{MEETING_CONTENT}', content) }
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage.total_tokens
  };
}

/**
 * Anthropic Claude extraction
 */
async function extractWithClaude(content: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Fastest and cheapest Claude model
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: USER_PROMPT.replace('{MEETING_CONTENT}', content) }
      ],
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokens: data.usage.input_tokens + data.usage.output_tokens
  };
}

/**
 * Google Gemini extraction
 */
async function extractWithGemini(content: string): Promise<any> {
  console.log(`[Gemini] Extracting from ${content.length} chars...`);
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a strict meeting-task extractor. Your ONLY job is to read ANY kind of meeting transcript and convert it into actionable tasks.

HANDLE ALL INPUT FORMATS: timestamped lines, speaker-based, paragraphs, bullets, mixed formats, messy transcripts.

EXTRACT ALL explicit or implied action items. Split multi-action sentences into separate tasks.

Return ONLY valid JSON array with this exact format:
[{"task":"action in 5-15 words","assignee":"name or null","deadline":"date/term or null","source_text":"exact original text","confidence":"high|medium|low"}]

No explanations. Only JSON.

Extract tasks from: ${content}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: MAX_TOKENS,
        responseMimeType: 'application/json'
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gemini] API Error ${response.status}:`, errorText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    tokens: data.usageMetadata?.totalTokenCount || 0
  };
}

// ============================================================================
// Main Extraction Functions
// ============================================================================

/**
 * Extract tasks using AI (single request)
 */
export async function extractTasksWithAI(notes: string): Promise<ExtractResponse> {
  console.log(`[AI] Using ${AI_PROVIDER} for extraction...`);

  let result;
  try {
    switch (AI_PROVIDER) {
      case 'openai':
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
        result = await extractWithOpenAI(notes);
        break;
      case 'anthropic':
        if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
        result = await extractWithClaude(notes);
        break;
      case 'gemini':
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
        result = await extractWithGemini(notes);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
    }

    // Parse AI response - handle both array format and object format
    let parsed = JSON.parse(result.content);
    let rawTasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
    
    // Convert new format to existing format
    const tasks: ExtractedTask[] = rawTasks.map((t: any) => ({
      title: t.task || t.title,
      description: t.source_text || t.description || 'Extracted from meeting',
      assignee: t.assignee,
      priority: t.confidence === 'high' ? 'high' : (t.confidence === 'low' ? 'low' : 'medium'),
      dueDate: t.deadline || t.dueDate
    }));

    // Normalize + refine
    const refined = refineTasks(notes, tasks);

    console.log(`[AI] Extracted ${refined.length} tasks using ${result.tokens} tokens`);

    return {
      tasks: refined,
      metadata: {
        processedAt: new Date().toISOString(),
        model: `${AI_PROVIDER}-ai`,
        totalTokens: result.tokens
      }
    };

  } catch (error) {
    console.error(`[AI] Extraction failed:`, error);
    throw error;
  }
}

/**
 * Extract tasks from long transcripts using chunking
 */
export async function extractTasksWithChunking(notes: string): Promise<ExtractResponse> {
  console.log(`[AI] Using chunking for large transcript (${notes.length} chars)`);

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < notes.length; i += CHUNK_SIZE) {
    chunks.push(notes.substring(i, i + CHUNK_SIZE));
  }

  console.log(`[AI] Processing ${chunks.length} chunks...`);

  // Process each chunk
  const allTasks: ExtractedTask[] = [];
  let totalTokens = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkResult = await extractTasksWithAI(chunks[i]);
      allTasks.push(...chunkResult.tasks);
      totalTokens += chunkResult.metadata?.totalTokens || 0;
      
      console.log(`[AI] Chunk ${i + 1}/${chunks.length}: ${chunkResult.tasks.length} tasks`);
      
      // Rate limiting: wait 1 second between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn(`[AI] Chunk ${i + 1} failed:`, error);
      // Continue with other chunks
    }
  }

  // Deduplicate similar tasks
  const uniqueTasks = deduplicateTasks(allTasks);

  console.log(`[AI] Chunking complete: ${uniqueTasks.length} unique tasks from ${totalTokens} tokens`);

  return {
    tasks: uniqueTasks,
    metadata: {
      processedAt: new Date().toISOString(),
      model: `${AI_PROVIDER}-chunked`,
      totalTokens,
      chunksProcessed: chunks.length
    }
  };
}

/**
 * Remove duplicate tasks based on title similarity
 */
function deduplicateTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  const unique: ExtractedTask[] = [];
  
  for (const task of tasks) {
    const isDuplicate = unique.some(existing => 
      similarity(task.title.toLowerCase(), existing.title.toLowerCase()) > 0.8
    );
    
    if (!isDuplicate) {
      unique.push(task);
    }
  }
  
  return unique;
}

/**
 * Simple string similarity calculation
 */
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// ============================================================================
// Refinement and Post-processing
// ============================================================================

const ACTION_VERBS = [
  'implement','finish','complete','start','handle','push','fix','prepare','deploy','integrate','update','design','create','build','develop','write','review','test','schedule','upload','compile','gather','send','confirm','align','meet','document'
];

function scoreTask(t: ExtractedTask): number {
  let s = 0;
  const title = (t.title || '').toLowerCase();
  if (t.dueDate) s += 2;
  if (t.assignee && t.assignee.trim().length > 0) s += 1;
  if (ACTION_VERBS.some(v => title.includes(v))) s += 1;
  if (title.length >= 10 && title.length <= 140) s += 0.5;
  return s;
}

function normalizeTask(t: ExtractedTask): ExtractedTask {
  let title = (t.title || '').trim();
  // Remove trailing question marks or trailing periods and lowercase artifacts
  title = title.replace(/\s*\?+\s*$/,'').replace(/\s+\.+\s*$/,'').replace(/\s{2,}/g,' ').trim();
  // Capitalize first letter
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
  const priority = (t.priority === 'high' || t.priority === 'low') ? t.priority : 'medium';
  const assignee = t.assignee?.trim();
  return {
    title,
    description: t.description || 'Extracted from meeting notes',
    assignee,
    priority,
    dueDate: t.dueDate
  };
}

function mergeAndLimit(base: ExtractedTask[], extras: ExtractedTask[]): ExtractedTask[] {
  const merged = deduplicateTasks([...base, ...extras].map(normalizeTask));
  // If too many, pick top by score
  if (merged.length > TASK_MAX) {
    return merged
      .sort((a,b) => scoreTask(b) - scoreTask(a))
      .slice(0, TASK_MAX);
  }
  return merged;
}

function refineTasks(notes: string, tasks: ExtractedTask[]): ExtractedTask[] {
  // Clean, dedupe
  let refined = deduplicateTasks(tasks.map(normalizeTask))
    .filter(t => t.title && t.title.length > 5);

  // Cap to TASK_MAX if many
  if (refined.length > TASK_MAX) {
    refined = refined.sort((a,b) => scoreTask(b) - scoreTask(a)).slice(0, TASK_MAX);
  }

  // If very few tasks returned but the transcript is substantial, try heuristic fallback to fill gaps
  const longTranscript = notes.length > 2000;
  if (refined.length < Math.min(6, TASK_MIN - 2) && longTranscript) {
    try {
      const fallback = heuristicExtract(notes).tasks || [];
      refined = mergeAndLimit(refined, fallback);
    } catch (_) {
      // ignore fallback failure
    }
  }

  return refined;
}
