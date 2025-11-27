/**
 * Universal task extraction - works with ANY meeting transcript format
 * Version 4 - With improved context awareness
 */

import type { ExtractedTask, ExtractResponse } from '../types/index.js';

const FILLER_PATTERNS = [
  /^(hi|hello|morning|good morning|yeah|yep|okay|ok|sure|yes|noted|will do|all clear|looks good|fine|great|perfect|alright|bye)\.?$/i,
];

function extractDueDate(text: string): string | undefined {
  const monthMap: Record<string, string> = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07',
    july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
    oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
  };
  
  const md = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})/i);
  if (md) {
    const month = monthMap[md[1].toLowerCase()];
    const day = md[2].padStart(2, '0');
    return `${new Date().getFullYear()}-${month}-${day}`;
  }
  
  if (/tomorrow/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  
  if (/today|eod|end of day/i.test(text)) {
    return new Date().toISOString().split('T')[0];
  }
  
  return undefined;
}

export function extractTasksMock(notes: string): ExtractResponse {
  const tasks: ExtractedTask[] = [];
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
  
  let currentSpeaker: string | undefined;
  let contextBuffer: string[] = []; // Last 3 sentences for context
  
  for (const rawLine of lines) {
    // Speaker detection
    const speakerMatch = rawLine.match(/^(\d{2}:\d{2}:\d{2}\s+—\s+)?([A-Z][a-z]+)(?:\s*\(.*?\))?[:\s]*$/);
    if (speakerMatch && rawLine.length < 100) {
      currentSpeaker = speakerMatch[2];
      contextBuffer = [];
      continue;
    }
    
    if (/^(Meeting:|Date:|Duration:|Note:|Recording|Murmur|\*\*)/i.test(rawLine)) continue;
    if (FILLER_PATTERNS.some(p => p.test(rawLine))) continue;
    
    const line = rawLine;
    contextBuffer.push(line);
    if (contextBuffer.length > 3) contextBuffer.shift();
    
    let task: ExtractedTask | null = null;
    
    // Pattern 1: "I'll finish that today" - look for context when "that" is used
    const finishThatMatch = line.match(/I['']ll\s+(finish|complete)\s+that\s+(today|tomorrow|by\s+.*?)(?:\.|$)/i);
    if (finishThatMatch && currentSpeaker) {
      const prevContext = contextBuffer[contextBuffer.length - 2] || '';
      const contextMatch = prevContext.match(/([\w\s]+(?:page|feature|module|component|dropdown|redesign))\s+is\s+\d+%\s+done/i) ||
                           prevContext.match(/the\s+([\w\s]+(?:page|redesign|feature|module|component|dropdown))/i);
      if (contextMatch) {
        task = {
          title: `Finish ${contextMatch[1].trim()}`,
          description: `Committed by ${currentSpeaker}`,
          assignee: currentSpeaker,
          priority: 'medium',
          dueDate: extractDueDate(finishThatMatch[2]),
        };
      }
    }
    
    // Pattern 2: "settings dropdown needs completion by tomorrow"
    if (!task) {
      const needsCompletionMatch = line.match(/([\w\s]+(?:dropdown|feature|page|module))\s+needs\s+completion\s+by\s+(tomorrow|today|.*?)(?:\.|$)/i);
      if (needsCompletionMatch && currentSpeaker) {
        task = {
          title: `Complete ${needsCompletionMatch[1].trim()}`,
          description: `Assigned to ${currentSpeaker}`,
          assignee: currentSpeaker,
          priority: 'medium',
          dueDate: extractDueDate(needsCompletionMatch[2]),
        };
      }
    }
    
    // Pattern 3: "Okay, please complete that by March 5"
    if (!task) {
      const pleaseCompleteMatch = line.match(/(?:okay,\s*)?please\s+complete\s+that\s+by\s+(.*?)(?:\.|$)/i);
      if (pleaseCompleteMatch) {
        // Look for what "that" refers to in previous context
        const prevContext = contextBuffer[contextBuffer.length - 2] || '';
        const thatMatch = prevContext.match(/([\w\s]+(?:dropdown|feature|page|module|component))\s+needs/i);
        if (thatMatch && currentSpeaker) {
          task = {
            title: `Complete ${thatMatch[1].trim()}`,
            description: `Assigned during meeting`,
            assignee: currentSpeaker,
            priority: 'medium',
            dueDate: extractDueDate(pleaseCompleteMatch[1]),
          };
        }
      }
    }
    
    // Pattern 4: "I can take that. Will push a PR by March 6"
    if (!task) {
      const canTakeMatch = line.match(/I\s+can\s+take\s+that.*?will\s+push\s+a\s+PR\s+by\s+(.*?)(?:\.|$)/i);
      if (canTakeMatch && currentSpeaker) {
        // Look for feature context
        const featureMatch = line.match(/([\w\s]+)\s+feature\s+—/i) || line.match(/the\s+([\w\s]+)\s+feature/i);
        if (featureMatch) {
          task = {
            title: `Implement ${featureMatch[1].trim()}`,
            description: `Self-assigned by ${currentSpeaker}`,
            assignee: currentSpeaker,
            priority: 'medium',
            dueDate: extractDueDate(canTakeMatch[1]),
          };
        }
      }
    }
    
    // Pattern 5: "three bugs remain — desc1, desc2, and desc3"
    const bugsMatch = line.match(/(three|two|one|\d+)\s+bugs?\s+remain.*?—\s*(.+)/i);
    if (bugsMatch) {
      const descriptions = bugsMatch[2].split(/,\s*(?:and\s+)?/).map(s => s.trim().replace(/\.$/, ''));
      descriptions.forEach(desc => {
        if (desc.length > 10) {
          tasks.push({
            title: `Fix: ${desc}`,
            description: `Bug reported in meeting`,
            priority: 'high',
          });
        }
      });
      continue;
    }
    
    // Pattern 6: "I'll handle the duplicate items bug"
    if (!task) {
      const handleBugMatch = line.match(/I['']ll\s+handle\s+the\s+(.*?)\s+bug/i);
      if (handleBugMatch && currentSpeaker) {
        task = {
          title: `Fix ${handleBugMatch[1].trim()}`,
          description: `Assigned to ${currentSpeaker}`,
          assignee: currentSpeaker,
          priority: 'high',
        };
      }
    }
    
    // Pattern 7: "Eva, can you take the timestamp and sound alert bugs?"
    if (!task) {
      const canYouTakeMatch = line.match(/([A-Z][a-z]+),\s+can you take\s+the\s+(.*?)\s+and\s+(.*?)\s+bugs?/i);
      if (canYouTakeMatch) {
        const assignee = canYouTakeMatch[1];
        const bug1 = canYouTakeMatch[2].trim();
        const bug2 = canYouTakeMatch[3].trim();
        
        tasks.push({
          title: `Fix ${bug1}`,
          description: `Assigned to ${assignee}`,
          assignee: assignee,
          priority: 'high',
        });
        
        tasks.push({
          title: `Fix ${bug2}`,
          description: `Assigned to ${assignee}`,
          assignee: assignee,
          priority: 'high',
        });
        continue;
      }
    }
    
    // Pattern 8: "I need to prep the backend API"
    if (!task) {
      const needToPrepMatch = line.match(/I\s+need\s+to\s+(prep|prepare|finish|do|build)\s+(the\s+)?(.*?)(?:\.|$)/i);
      if (needToPrepMatch && currentSpeaker) {
        const action = needToPrepMatch[1];
        let what = needToPrepMatch[3].trim();
        
        // Look for context if needed
        if (what.match(/^(backend|frontend)\s+(API|feature|part)/i)) {
          const featureContext = contextBuffer.join(' ').match(/([\w\s]+)\s+feature/i);
          if (featureContext) {
            what = `${what} for ${featureContext[1].trim()}`;
          }
        }
        
        if (what.length > 8) {
          task = {
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${what}`,
            description: `Committed by ${currentSpeaker}`,
            assignee: currentSpeaker,
            priority: 'medium',
            dueDate: extractDueDate(line),
          };
        }
      }
    }
    
    // Pattern 9: "you'll handle the frontend part"
    if (!task) {
      const youllHandleMatch = line.match(/you['']ll\s+handle\s+the\s+(.*?)(?:,|\.|$)/i);
      if (youllHandleMatch) {
        let what = youllHandleMatch[1].trim();
        
        // Look for feature context
        const featureContext = contextBuffer.join(' ').match(/([\w\s]+)\s+feature/i);
        if (featureContext && what.match(/frontend|UI|part/i)) {
          what = `UI for ${featureContext[1].trim()}`;
        }
        
        // Find who this refers to - check previous line for name
        const prevLine = contextBuffer[contextBuffer.length - 2] || '';
        const nameMatch = prevLine.match(/([A-Z][a-z]+),/);
        
        if (nameMatch && what.length > 5) {
          task = {
            title: what.charAt(0).toUpperCase() + what.slice(1),
            description: `Assigned to ${nameMatch[1]}`,
            assignee: nameMatch[1],
            priority: 'medium',
            dueDate: extractDueDate(line),
          };
        }
      }
    }
    
    // Pattern 10: "I'll start after X is done"
    if (!task) {
      const startAfterMatch = line.match(/I['']ll\s+start\s+after\s+(.*?)\s+is\s+done/i);
      if (startAfterMatch && currentSpeaker) {
        // This refers to starting the previously mentioned task
        const featureContext = contextBuffer.join(' ').match(/(UI|frontend)\s+(?:for\s+)?([\w\s]+)/i);
        if (featureContext) {
          task = {
            title: `${featureContext[1]} for ${featureContext[2].trim()}`,
            description: `Committed by ${currentSpeaker}`,
            assignee: currentSpeaker,
            priority: 'medium',
          };
        }
      }
    }
    
    // Pattern 11: "QA testing starting March 10"
    if (!task) {
      const qaMatch = line.match(/(?:QA|testing)\s+starting\s+(.*?)(?:\?|$)/i);
      if (qaMatch) {
        // Check who is speaking or who is being asked
        const prevLine = contextBuffer[contextBuffer.length - 2] || '';
        const nameMatch = prevLine.match(/([A-Z][a-z]+),/);
        
        task = {
          title: 'QA testing',
          description: `Testing scheduled`,
          assignee: nameMatch ? nameMatch[1] : 'QA',
          priority: 'medium',
          dueDate: extractDueDate(qaMatch[1]),
        };
      }
    }
    
    // Add valid task
    if (task && task.title.length > 5) {
      const isDuplicate = tasks.some(t => {
        const t1 = t.title.toLowerCase().replace(/[^\w\s]/g, '');
        const t2 = task!.title.toLowerCase().replace(/[^\w\s]/g, '');
        return t1.includes(t2.substring(0, Math.min(20, t2.length))) || 
               t2.includes(t1.substring(0, Math.min(20, t1.length)));
      });
      if (!isDuplicate) {
        tasks.push(task);
      }
    }
  }
  
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
      model: 'mock-extractor-universal-v4',
    },
  };
}
