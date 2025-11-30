# MeetingMind AI - Cliq Extension

This extension adds a `/meetingmind` slash command to Zoho Cliq to extract tasks from meeting notes.

## 📂 Folder Structure

- `plugin-manifest.json`: The configuration file for the extension.
- `server.js`: A local Node.js server to handle the slash command (for development/demo).
- `lib/extractor.js`: The logic to extract tasks from text.

## 🚀 How to Run Locally

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the server:
    ```bash
    node server.js
    ```
3.  Expose your local server to the internet using ngrok:
    ```bash
    ngrok http 3000
    ```
4.  Copy the HTTPS URL from ngrok (e.g., `https://abcd-1234.ngrok.io`).

## 📦 How to Submit to Cliqtrix 26

1.  **Update Manifest**: Open `plugin-manifest.json` and replace `https://YOUR_NGROK_URL/cliq/command` with your actual ngrok URL (or deployed URL if you host it).
2.  **Zip the Folder**: Create a zip file containing `plugin-manifest.json` and the `assets` folder (if you added icons).
    - *Note: For this hackathon, you might need to submit the code or a working link.*
3.  **Submit**: Go to the Cliqtrix submission portal and upload your extension.

## 🛠 Testing

You can test the command locally using the provided script:
```bash
node test-command.js
```
