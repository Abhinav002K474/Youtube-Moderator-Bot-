# 🚀 YouTube Moderator Bot - Backend

This is the Node.js backend for the YouTube Moderator Bot. It handles the YouTube API integration, spam detection logic, and real-time communication via Socket.io.

## 🛠️ Tech Stack
- **Node.js**: Runtime environment.
- **Express**: Web framework for API endpoints and OAuth callbacks.
- **Socket.io**: Real-time event handling.
- **Googleapis**: Official Google SDK for YouTube Data API v3.

## ⚙️ Core Logic
- **`checkSpam()`**: Analyzes message text for banned words, excessive emojis, and links.
- **`pollChat()`**: Fetches new messages from the active live chat at intervals.
- **`processYoutubeMessage()`**: Orchestrates spam detection, trust score updates, and automated moderation actions (delete/ban).
- **`pollMetrics()` & `pollSubscribers()`**: Keeps analytics data fresh.

## 🚀 Setup
1. Install dependencies: `npm install`
2. Configure `.env` (use `.env.example` as a template).
3. Start the server: `npm start`

For full project details and frontend setup, please refer to the [Root README](../README.md).
