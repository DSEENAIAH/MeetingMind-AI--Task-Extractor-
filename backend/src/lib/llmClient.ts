/**
 * lib/llmClient.ts
 * 
 * Purpose: Gemini AI client for task extraction from meeting notes
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedTask, ExtractResponse } from '../types/index.js';

// Lazy initialize to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const EXTRACTION_PROMPT = `You are a JSON-only API. Extract tasks from the meeting transcript below.

Return ONLY a JSON object with this exact structure (no text before or after):
{"tasks":[{"title":"Task name","description":"Details","assignee":"Name or null","priority":"high|medium|low","dueDate":"YYYY-MM-DD or null","optional":false,"inferred":false,"confidence":"high","sourceText":"","evidenceContext":""}]}

Rules:
- Explicit tasks: Direct assignments ("John, do X") → inferred:false
- Implied tasks: Suggestions ("someone should..."), questions ("can you...?") → inferred:true, add sourceText
- Optional: "(optional)" keywords → optional:true
- Skip: Past tense, descriptions without action

Today: ${new Date().toISOString().split('T')[0]}

Meeting transcript:`;

export async function extractTasksWithGemini(notes: string): Promise<ExtractResponse> {
  try {
    const model = getGenAI().getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    
    const result = await model.generateContent(`${EXTRACTION_PROMPT}\n\n${notes}`);
    const response = await result.response;
    const text = response.text();
    
    console.log('[Gemini] Raw response length:', text.length);
    console.log('[Gemini] Raw response preview:', text.substring(0, 1000));
    
    // Clean and parse JSON response with repair logic
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find JSON object (handle cases where Gemini adds extra text)
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to extract JSON after common prefixes
      const prefixMatch = text.match(/(?:Here'?s?|Response|Output|Result)[\s:]*(\{[\s\S]*\})/i);
      if (prefixMatch) {
        jsonMatch = prefixMatch[1].match(/\{[\s\S]*\}/);
      }
    }
    
    if (!jsonMatch) {
      console.error('[Gemini] Failed to find JSON in response.');
      console.error('[Gemini] Full response text:', text);
      console.error('[Gemini] Response length:', text.length);
      console.error('[Gemini] First 2000 chars:', text.substring(0, 2000));
      
      // Write to file for debugging
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../../gemini-error.log');
      fs.writeFileSync(logPath, `=== Gemini Response Error ===\nTimestamp: ${new Date().toISOString()}\nLength: ${text.length}\n\nFull Response:\n${text}\n\n`, { flag: 'a' });
      
      throw new Error(`No JSON found in Gemini response. Response logged to ${logPath}`);
    }
    
    let parsed;
    let jsonString = jsonMatch[0];
    
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[Gemini] Initial JSON parse failed, attempting repair...');
      console.error('[Gemini] Parse error:', parseError);
      
      // Attempt to repair common JSON issues
      try {
        // Fix trailing commas before closing braces/brackets
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        // Fix missing commas between objects (simple heuristic)
        jsonString = jsonString.replace(/\}(\s*)\{/g, '},\n{');
        // Remove any trailing incomplete objects
        const lastCompleteCloseBrace = jsonString.lastIndexOf('}]');
        if (lastCompleteCloseBrace > -1) {
          jsonString = jsonString.substring(0, lastCompleteCloseBrace + 2) + '}';
        }
        
        parsed = JSON.parse(jsonString);
        console.log('[Gemini] JSON repaired successfully');
      } catch (repairError) {
        console.error('[Gemini] JSON repair failed');
        console.error('[Gemini] Original JSON (first 1000 chars):', jsonMatch[0].substring(0, 1000));
        throw new Error('Invalid JSON in Gemini response - unable to parse or repair');
      }
    }
    
    // Validate and normalize tasks (including optional and inferred detection)
    const tasks: ExtractedTask[] = (parsed.tasks || []).map((task: any) => {
      let title = String(task.title || 'Untitled task').trim();
      const optionalFlag = task.optional === true || /(optional|nice to have|if possible|later|future)/i.test(title);
      const inferredFlag = task.inferred === true;
      
      if (optionalFlag && !/^\(optional\)/i.test(title)) {
        title = `(optional) ${title.replace(/^(optional\s*[:-]\s*)/i,'').trim()}`;
      }
      
      return {
        title,
        description: String(task.description || 'Extracted from meeting transcript').trim(),
        assignee: task.assignee ? String(task.assignee).trim() : undefined,
        priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : (optionalFlag ? 'low' : 'medium'),
        dueDate: task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : undefined,
        optional: optionalFlag,
        inferred: inferredFlag,
        confidence: task.confidence ? String(task.confidence) : (inferredFlag ? 'medium' : 'high'),
        sourceText: task.sourceText ? String(task.sourceText).trim() : undefined,
        evidenceContext: task.evidenceContext ? String(task.evidenceContext).trim() : undefined,
      };
    });
    
    console.log(`[Gemini] Extracted ${tasks.length} tasks`);
    
    return {
      tasks,
      metadata: {
        processedAt: new Date().toISOString(),
        model: 'gemini-2.5-flash',
        transcriptLength: notes.length,
      },
    };
  } catch (error) {
    console.error('Gemini extraction failed:', error);
    throw error;
  }
}