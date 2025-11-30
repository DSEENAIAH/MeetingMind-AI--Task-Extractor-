const { mockExtractTasks } = require('./lib/extractor');

module.exports = (req, res) => {
    // Health check for browser access
    if (req.method === 'GET') {
        return res.status(200).send('MeetingMind AI is active! 🚀 (Use POST for commands)');
    }

    console.log('Received Slash Command:', req.body);

    const body = req.body || {};
    const args = body.arguments || '';
    const user = body.user || {};

    if (!args.trim()) {
        return res.json({
            text: "Please provide meeting notes to extract tasks from. Usage: `/meetingmind <notes>`"
        });
    }

    // Extract tasks
    const notes = args;
    const result = mockExtractTasks(notes);
    const tasks = result.tasks;

    // Format response for Cliq
    const taskList = tasks.map(t => {
        let icon = '⚪';
        if (t.priority === 'high') icon = '🔴';
        if (t.priority === 'medium') icon = '🟡';

        return `${icon} *${t.title}*\n${t.assignee ? `👤 Assigned to: ${t.assignee}` : ''} ${t.dueDate ? `📅 Due: ${t.dueDate}` : ''}`;
    }).join('\n\n');

    const response = {
        text: `### 📝 Extracted Tasks\n\n${taskList}\n\n[Create in Zoho Projects](https://projects.zoho.com/portal/YOUR_PORTAL_ID)`,
        card: {
            title: "MeetingMind AI - Extracted Tasks",
            theme: "modern-inline",
            thumbnail: "https://www.zoho.com/sites/default/files/cliq/images/extensions/default-extension-icon.png",
            rows: tasks.map(t => ({
                title: t.title,
                description: `${t.assignee ? '👤 ' + t.assignee : 'Unassigned'} | ${t.dueDate ? '📅 ' + t.dueDate : 'No Date'}`,
                image: t.priority === 'high' ? "https://img.icons8.com/color/48/high-priority.png" : "https://img.icons8.com/color/48/medium-priority.png"
            }))
        }
    };

    res.json(response);
};
