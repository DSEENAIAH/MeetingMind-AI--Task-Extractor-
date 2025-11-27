/**
 * lib/mockExtractor.ts
 * 
 * Purpose: Deterministic mock task extraction for demos and testing.
 * Updated: Nov 24, 2025 - Heuristic extraction for meeting transcripts
 * 
 * Why mock-first:
 * - Demos work without API keys or credits
 * - Reproducible results for testing
 * - Fast iteration during development
 * - Fallback when AI services are down
 * 
 * How it works:
 * - Pattern matching on common task indicators (TODO, ACTION, bullet points)
 * - Priority detection from keywords (urgent, high priority, ASAP)
 * - Assignee extraction from "@mentions" or "Name will/should do X"
 * - Due date detection from date-like patterns
 * 
 * Limitations:
 * - Not as smart as real AI (obviously)
 * - Relies on structured input (bullet points, keywords)
 * - Won't catch implicit tasks or nuanced language
 * 
 * NOTE: This is intentionally simple but deterministic. Real AI extraction
 * happens in llmClient.ts when USE_MOCK=false.
 */

import type { ExtractedTask, ExtractResponse } from '../types/index.js';

// ============================================================================
// Task Indicators (keywords that suggest a task)
// ============================================================================

const TASK_INDICATORS = [
  'todo',
  'action',
  'need to',
  'needs to',
  'should',
  'must',
  'will',
  'task',
  'deliverable',
  'follow up',
  'follow-up',
  'finish',
  'complete',
  'work on',
  'handle',
  'take care',
  'responsible for',
  'assigned to',
];

// Filler / acknowledgement lines to ignore as tasks
const FILLER_PATTERNS = [
  /^hi[,! ]?$/i,
  /^hello[,! ]?$/i,
  /^morning[,! ]?$/i,
  /^good morning/i,
  /^yeah[,! ]?$/i,
  /^yep[,! ]?$/i,
  /^okay[,! ]?$/i,
  /^ok[,! ]?$/i,
  /^all good/i,
  /^sounds good/i,
  /^no blockers/i,
  /^bye[,! ]?$/i,
  /^great[,! ]?$/i,
  /^perfect[,! ]?$/i,
  /^yes[,! ]?$/i,
  /^will do[,! ]?$/i,
  /^noted[,! ]?$/i,
  /^all clear[,! ]?$/i,
  /^looks good[,! ]?$/i,
  /^fine for qa[,! ]?$/i,
  /what's the status/i,
  /any pending items/i,
  /qa updates/i,
  /frontend tasks/i,
  /new sprint features/i,
  /let's begin/i,
  /ending the call/i,
  /have a productive sprint/i,
  /meeting ended/i,
  /quick recap/i,
  /thanks everyone/i,
  /^first,/i,
  /^next,/i,
  /^alright/i,
];

// Action verbs / nouns indicating real work
const ACTION_VERBS = [
  'finish', 'complete', 'start', 'begin', 'fix', 'prepare', 'push', 'deploy', 'integrate', 'update', 'design', 'layout', 'testing', 'test', 'release', 'close', 'review', 'cache', 'authentication'
];

const PRIORITY_HIGH_KEYWORDS = [
  'urgent',
  'asap',
  'critical',
  'high priority',
  'immediately',
  'emergency',
  'bug',
  'fix',
];

const PRIORITY_LOW_KEYWORDS = [
  'low priority',
  'when possible',
  'nice to have',
  'optional',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect priority from text content
 */
function detectPriority(text: string): 'low' | 'medium' | 'high' {
  const lowerText = text.toLowerCase();

  if (PRIORITY_HIGH_KEYWORDS.some((keyword) => lowerText.includes(keyword))) {
    return 'high';
  }

  if (PRIORITY_LOW_KEYWORDS.some((keyword) => lowerText.includes(keyword))) {
    return 'low';
  }

  return 'medium';
}

/**
 * Extract assignee from text (looks for @mentions or "Name will/should do X")
 * 
 * Examples:
 * - "@john to review PR" -> "john"
 * - "Sarah will update docs" -> "Sarah"
 * - "Mike needs to fix bug" -> "Mike"
 * - "Ramya, this is your task" -> "Ramya"
 * - "told John to finish it" -> "John"
 */
function extractAssignee(text: string): string | undefined {
  // Pattern 1: @mention
  const mentionMatch = text.match(/@(\w+)/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // Pattern 2: "Name will/should/needs to do X"
  const nameMatch = text.match(/^([A-Z][a-z]+)\s+(will|should|needs? to|must)/);
  if (nameMatch) {
    return nameMatch[1];
  }

  // Pattern 3: "Name, this is your task" or "Name said/mentioned"
  const commaMatch = text.match(/^([A-Z][a-z]+),\s+/);
  if (commaMatch) {
    return commaMatch[1];
  }

  // Pattern 4: "told/asked Name to do X"
  const toldMatch = text.match(/(told|asked|assigned)\s+([A-Z][a-z]+)\s+to/i);
  if (toldMatch) {
    return toldMatch[2];
  }

  // Pattern 5: "Name mentioned/said he/she will"
  const mentionedMatch = text.match(/^([A-Z][a-z]+)\s+(mentioned|said)\s+(he|she|they)/i);
  if (mentionedMatch) {
    return mentionedMatch[1];
  }

  return undefined;
}

/**
 * Extract due date from text (looks for date-like patterns)
 * 
 * Examples:
 * - "by Friday" -> (next Friday's date)
 * - "by EOD" -> (end of today)
 * - "by Nov 30" -> 2025-11-30
 * - "by end of week" -> (Friday of current week)
 * - "finish it by 10pm" -> (today)
 * - "by tomorrow" -> (tomorrow's date)
 * - "deadline of February 10" -> 2025-02-10
 * - "until February 20" -> 2025-02-20
 * - "by Feb 26" -> 2025-02-26
 * 
 * NOTE: This is very basic. Real implementation would use a date parsing library.
 */
function extractDueDate(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  // Month names mapping
  const months: { [key: string]: string } = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12',
  };

  // Pattern: "February 10", "Feb 20", "deadline of Feb 26"
  const monthDayPattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})/i;
  const monthMatch = text.match(monthDayPattern);
  if (monthMatch) {
    const month = months[monthMatch[1].toLowerCase()];
    const day = monthMatch[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  // EOD / end of day / by 10pm/5pm etc -> today
  if (lowerText.includes('eod') || lowerText.includes('end of day') || lowerText.match(/by\s+\d{1,2}(am|pm)/) || lowerText.includes('before evening') || lowerText.includes('by today')) {
    return new Date().toISOString().split('T')[0];
  }

  // Tomorrow (including "by tomorrow afternoon")
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // After meeting / after our meeting -> today (assuming meeting is today)
  if (lowerText.includes('after our meeting') || lowerText.includes('after meeting')) {
    return new Date().toISOString().split('T')[0];
  }

  // End of week -> next Friday
  if (lowerText.includes('end of week') || lowerText.includes('eow')) {
    const today = new Date();
    const friday = new Date(today);
    friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
    return friday.toISOString().split('T')[0];
  }

  // Day names (Monday, Tuesday, etc)
  const dayMatch = lowerText.match(/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[1]);
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // If same day, assume next week
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate.toISOString().split('T')[0];
  }

  // Simple date match (MM/DD or DD/MM)
  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (dateMatch) {
    const year = new Date().getFullYear();
    return `${year}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Clean up task text by removing indicators and extra whitespace
 */
function cleanTaskText(text: string): string {
  return text
    .replace(/^[-*•]\s*/, '') // Remove bullet points
    .replace(/^(TODO|ACTION|TASK):?\s*/i, '') // Remove task keywords
    .replace(/\(.*priority.*\)/gi, '') // Remove priority mentions
    .trim();
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract tasks from meeting notes using pattern matching.
 * 
 * Algorithm:
 * 1. Split notes into lines AND sentences (for paragraph transcripts)
 * 2. Identify task lines/sentences (bullet points, keywords, numbered items, conversational patterns)
 * 3. For each task:
 *    - Clean up the text
 *    - Detect priority from keywords
 *    - Extract assignee if mentioned
 *    - Extract due date if mentioned
 * 4. Return structured task objects
 * 
 * @param notes - Raw meeting notes as plain text or conversational transcript
 * @returns Structured extract response with tasks and metadata
 */
export function extractTasksMock(notes: string): ExtractResponse {
  const tasks: ExtractedTask[] = [];

  // Strategy 1: Line-by-line extraction (ONLY for structured notes with bullets/numbers)
  const lines = notes.split('\n').map((line) => line.trim()).filter(Boolean);
  
  // Only process line-by-line if notes appear to be structured (has bullets or line breaks)
  const hasStructuredFormat = lines.some(line => 
    line.startsWith('-') || 
    line.startsWith('*') || 
    line.startsWith('•') || 
    /^\d+\./.test(line)
  );

  if (hasStructuredFormat) {
    for (const line of lines) {
      // Check if this line looks like a task
      const isTask =
        line.startsWith('-') ||
        line.startsWith('*') ||
        line.startsWith('•') ||
        /^\d+\./.test(line); // Only bullet points and numbered lists

      if (isTask) {
        const cleanedText = cleanTaskText(line);
        if (FILLER_PATTERNS.some(p => p.test(cleanedText))) continue;
        const lowerClean = cleanedText.toLowerCase();
        const hasAction = ACTION_VERBS.some(v => lowerClean.includes(v));
        const hasAssignment = /(assigned|will|needs to|should|must|tasked|target|deadline|bug|release|testing)/i.test(cleanedText);
        const isQuestion = cleanedText.includes('?');
        const isShortResponse = cleanedText.length < 30 && !hasAction && !hasAssignment;
        if (isQuestion || isShortResponse) continue;
        
        if (cleanedText.length >= 5) {
          const task: ExtractedTask = {
            title: cleanedText,
            description: `Extracted from meeting notes: "${line}"`,
            priority: detectPriority(line),
          };

          const assignee = extractAssignee(line);
          if (assignee) {
            task.assignee = assignee;
          }

          const dueDate = extractDueDate(line);
          if (dueDate) {
            task.dueDate = dueDate;
          }

          tasks.push(task);
        }
      }
    }
  }

  // Strategy 2: Sentence-level extraction (for paragraph transcripts)
  // Split by sentences and look for assignment patterns
  const sentences = notes
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  for (const sentence of sentences) {
    if (FILLER_PATTERNS.some(p => p.test(sentence))) continue;
    // Pattern: "Name was assigned/scheduled/given to do X"
    // Pattern: "Name would do X by Date"
    // Pattern: "team/everyone agreed to X"
    const assignmentPatterns = [
      /([A-Z][a-z]+)\s+was\s+assigned\s+to\s+(.+)/,
      /([A-Z][a-z]+)\s+was\s+scheduled\s+to\s+(.+)/,
      /([A-Z][a-z]+)\s+was\s+given\s+(.+)/,
      /([A-Z][a-z]+)\s+would\s+(.+)/,
      /([A-Z][a-z]+)\s+was\s+tasked\s+with\s+(.+)/,
      /(team|everyone|all)\s+agreed\s+to\s+(hold|have|schedule)\s+(.+)/i,
    ];

    for (const pattern of assignmentPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        let assignee = match[1];
        let taskDescription = match[2];

        // Handle "team agreed to X" pattern differently
        if (assignee && assignee.toLowerCase() === 'team' || assignee.toLowerCase() === 'everyone' || assignee.toLowerCase() === 'all') {
          taskDescription = match[3] || match[2];
          assignee = 'Team';
        }

        // Clean up the task description
        taskDescription = taskDescription
          .replace(/^(to\s+)?/, '')
          .replace(/,\s*with\s+a\s+deadline.*$/i, '')
          .trim();

        // Skip if already extracted (avoid duplicates)
        const isDuplicate = tasks.some(
          (t) => t.assignee === assignee && t.title.includes(taskDescription.substring(0, 20))
        );

        if (!isDuplicate && taskDescription.length >= 10) {
          const task: ExtractedTask = {
            title: taskDescription,
            description: `Extracted from: "${sentence}"`,
            priority: detectPriority(sentence),
            assignee: assignee,
          };

          const dueDate = extractDueDate(sentence);
          if (dueDate) {
            task.dueDate = dueDate;
          }

          tasks.push(task);
        }
        break; // Only match one pattern per sentence
      }
    }
  }

  // Strategy 3: Sprint Planning specific patterns (for meeting transcripts)
  // Apply for all meeting transcripts with timestamps
  const hasTimestamps = /\d{2}:\d{2}:\d{2}/.test(notes);
  if (hasTimestamps || tasks.length <= 1) {
    let currentSpeaker: string | undefined;
    const todayISO = new Date().toISOString().split('T')[0];
    const transcriptLines = notes.split('\n').map(l => l.trim()).filter(Boolean);

    const pushTask = (title: string, opts: { assignee?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => {
      // Avoid duplicates by title substring
      if (tasks.some(t => t.title.toLowerCase().includes(title.toLowerCase().substring(0, 15)))) return;
      tasks.push({
        title,
        description: `Extracted from meeting transcript`,
        assignee: opts.assignee,
        dueDate: opts.dueDate,
        priority: opts.priority || 'medium',
      });
    };

    for (const rawLine of transcriptLines) {
      // Parse speaker from timestamp format: [00:22] Seenu: or 00:22 Seenu:
      const speakerMatch = rawLine.match(/^(?:\[?\d{2}:\d{2}(?::\d{2})?\]?\s+)([A-Z][a-z]+)(?:\s*\([^)]*\))?:\s*(.+)$/i);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim();
        const content = speakerMatch[2].trim();
        
        // Check if this speaker line contains a task commitment
        const lower = content.toLowerCase();
        
        // Pattern: "I can/will do X" - speaker commits to task
        if (/^i\s+(can|will|'ll)\s+(.+)/i.test(content)) {
          const taskMatch = content.match(/^i\s+(?:can|will|'ll)\s+(.+)/i);
          if (taskMatch) {
            const taskDesc = taskMatch[1].replace(/\.$/, ''); // Remove trailing period
            pushTask(taskDesc, { assignee: currentSpeaker, dueDate: extractDueDate(taskDesc) });
          }
        }
        continue;
      }

      // Parse non-speaker lines (usually manager assigning tasks)
      const line = rawLine.replace(/[""]/g, '"').replace(/[']/g, "'");
      if (FILLER_PATTERNS.some(p => p.test(line))) continue;
      const lower = line.toLowerCase();

      // Pattern: "Name, after X, can you Y" or "Name, can you Y"
      const canYouMatch = line.match(/([A-Z][a-z]+),\s+(?:after\s+[^,]+,\s+)?can\s+you\s+(.+?)\?/i);
      if (canYouMatch) {
        const assignee = canYouMatch[1];
        const taskDesc = canYouMatch[2];
        pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
      }
      
      // Pattern: "who's doing X" - indicates need for assignment
      const whosMatch = line.match(/who'?s\s+(doing|updating|handling)\s+(.+?)\?/i);
      if (whosMatch) {
        const action = whosMatch[1];
        const taskDesc = `${action} ${whosMatch[2]}`;
        pushTask(taskDesc, { dueDate: extractDueDate(taskDesc) });
      }
      
      // Pattern: "we need X" - indicates required task
      const needMatch = line.match(/we\s+need\s+(.+?)\./i);
      if (needMatch) {
        const taskDesc = needMatch[1];
        pushTask(taskDesc, { dueDate: extractDueDate(taskDesc) });
      }
      
      // Pattern: "Name to do X by Date"
      const taskMatch = line.match(/([A-Z][a-z]+)\s+to\s+(.+?)\s+by\s+(\w+)/i);
      if (taskMatch) {
        const assignee = taskMatch[1];
        const taskDesc = taskMatch[2];
        const deadline = taskMatch[3];
        pushTask(taskDesc, { assignee, dueDate: extractDueDate(`by ${deadline}`) });
      }

      // Pattern: "Name will do X"
      const willMatch = line.match(/([A-Z][a-z]+)\s+will\s+(.+)/i);
      if (willMatch) {
        const assignee = willMatch[1];
        const taskDesc = willMatch[2];
        pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
      }
      
      // Pattern: "Name needs to X"
      const needsMatch = line.match(/([A-Z][a-z]+)\s+needs?\s+to\s+(.+)/i);
      if (needsMatch) {
        const assignee = needsMatch[1];
        const taskDesc = needsMatch[2];
        pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
      }
    }
  }

  // If no tasks found, create a generic one
  if (tasks.length === 0) {
    tasks.push({
      title: 'Review meeting notes',
      description: notes.substring(0, 200),
      priority: 'low',
    });
  }

  return {
    tasks,
    metadata: {
      processedAt: new Date().toISOString(),
      model: 'mock-extractor-v1',
    },
  };
}

/**
 * Normalize extracted tasks (used for testing and validation)
 * Ensures all tasks have required fields and valid values
 */
export function normalizeTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  return tasks.map((task) => ({
    title: task.title.trim(),
    description: task.description.trim(),
    assignee: task.assignee?.trim(),
    priority: task.priority || 'medium',
    dueDate: task.dueDate,
  }));
}