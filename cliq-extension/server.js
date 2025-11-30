const express = require('express');
const bodyParser = require('body-parser');
const { mockExtractTasks } = require('./lib/extractor');

const app = express();
const PORT = process.env.PORT || 3000;
// Cliq Slash Command Handler
app.post('/cliq/command', (req, res) => {
    console.log('Received Slash Command:', req.body);

    const { arguments: args, user } = req.body;
    const notes = args || '';

    if (!notes.trim()) {
        return res.json({
            text: "Please provide meeting notes to extract tasks from. Usage: `/meetingmind <notes>`"
        });
    }

    // Extract tasks
    const result = mockExtractTasks(notes);
    const tasks = result.tasks;

    // Format response for Cliq
    // We'll return a card or a formatted message
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
            thumbnail: "https://www.zoho.com/sites/default/files/cliq/images/extensions/default-extension-icon.png", // Replace with actual icon URL
            rows: tasks.map(t => ({
                title: t.title,
                description: `${t.assignee ? '👤 ' + t.assignee : 'Unassigned'} | ${t.dueDate ? '📅 ' + t.dueDate : 'No Date'}`,
                image: t.priority === 'high' ? "https://img.icons8.com/color/48/high-priority.png" : "https://img.icons8.com/color/48/medium-priority.png"
            }))
        }
    };

    res.json(response);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
