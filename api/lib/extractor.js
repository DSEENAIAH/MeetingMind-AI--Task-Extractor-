/**
 * Mock task extraction logic ported for Node.js
 */

function mockExtractTasks(notes) {
    const tasks = [];

    // Filler patterns to ignore
    const FILLER_PATTERNS = [
        /^hi[,! ]?$/i, /^hello[,! ]?$/i, /^morning[,! ]?$/i, /^good morning/i,
        /^yeah[,! ]?$/i, /^yep[,! ]?$/i, /^okay[,! ]?$/i, /^ok[,! ]?$/i,
        /^all good/i, /^sounds good/i, /^no blockers/i, /^bye[,! ]?$/i,
        /^great[,! ]?$/i, /^perfect[,! ]?$/i, /^no issues/i, /^on track/i,
    ];

    // Date extraction
    function extractDueDate(text) {
        const monthMap = {
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

    const pushTask = (title, opts = {}) => {
        if (tasks.some(t => t.title.toLowerCase().includes(title.toLowerCase().substring(0, 20)))) return;
        tasks.push({
            title,
            description: `Extracted from transcript`,
            assignee: opts.assignee,
            dueDate: opts.dueDate,
            priority: 'medium',
        });
    };

    const transcriptLines = notes.split('\n').map(l => l.trim()).filter(Boolean);
    let currentSpeaker;

    for (const rawLine of transcriptLines) {
        // Parse speaker from timestamp format: [00:22] Seenu: or 00:22 Seenu:
        const speakerMatch = rawLine.match(/^(?:\[?\d{2}:\d{2}(?::\d{2})?\]?\s+)([A-Z][a-z]+)(?:\s*\([^)]*\))?:\s*(.+)$/i);
        if (speakerMatch) {
            currentSpeaker = speakerMatch[1].trim();
            const content = speakerMatch[2].trim();

            // Pattern: "I can/will do X" - speaker commits to task
            if (/^i\s+(can|will|'ll)\s+(.+)/i.test(content)) {
                const taskMatch = content.match(/^i\s+(?:can|will|'ll)\s+(.+)/i);
                if (taskMatch) {
                    const taskDesc = taskMatch[1].replace(/\.$/, '');
                    pushTask(taskDesc, { assignee: currentSpeaker, dueDate: extractDueDate(taskDesc) });
                }
            }
            continue;
        }

        const line = rawLine.replace(/[""]/g, '"').replace(/[']/g, "'");
        if (FILLER_PATTERNS.some(p => p.test(line))) continue;

        // Pattern: "Name, after X, can you Y" or "Name, can you Y"
        const canYouMatch = line.match(/([A-Z][a-z]+),\s+(?:after\s+[^,]+,\s+)?can\s+you\s+(.+?)\?/i);
        if (canYouMatch) {
            const assignee = canYouMatch[1];
            const taskDesc = canYouMatch[2];
            pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
        }

        // Pattern: "Name to do X by Date"
        const taskMatch = line.match(/([A-Z][a-z]+)\s+to\s+(.+?)\s+by\s+(\w+)/i);
        if (taskMatch) {
            const assignee = taskMatch[1];
            const taskDesc = taskMatch[2];
            const deadline = taskMatch[3];
            pushTask(taskDesc, { assignee, dueDate: extractDueDate(`by ${deadline}`) });
        }
    }

    // Fallback
    if (tasks.length === 0 && notes.length > 0) {
        const bulletMatches = notes.match(/^\s*[-*•]\s+(.+)$/gm);
        if (bulletMatches) {
            for (const bullet of bulletMatches) {
                const cleanBullet = bullet.replace(/^\s*[-*•]\s+/, '').trim();
                pushTask(cleanBullet, { dueDate: extractDueDate(cleanBullet) });
            }
        } else {
            tasks.push({
                title: 'Review meeting notes',
                description: notes.substring(0, 200),
                priority: 'low',
            });
        }
    }

    return { tasks };
}

module.exports = { mockExtractTasks };
