# 🛡️ Black Cat - YouTube Moderator Bot

A powerful, real-time AI-driven moderation dashboard for YouTube Live Streams. This tool helps creators manage their community by automatically detecting spam, blocking malicious links, and providing a sleek interface for manual moderation and live analytics.

![YouTube Moderator Bot](https://img.shields.io/badge/YouTube-Moderator-red?style=for-the-badge&logo=youtube)
![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

**Live Link:** [https://black-cat-pinix-10.vercel.app](https://black-cat-pinix-10.vercel.app)

---

## ✨ Features

- **🤖 Automated Spam Detection**: Multi-layered filtering system to catch spam before it ruins your stream.
- **🌊 Spam Wave Attack Prevention**: Detects coordinated spam attacks (identical patterns from multiple users) and alerts the creator instantly.
- **💎 Trust Score System**: Every user is assigned a dynamic trust score. Spammers lose points, while loyal viewers gain them. Auto-timeouts occur when scores drop too low.
- **📊 Live Analytics**: Real-time tracking of viewers, likes, subscriber growth, and message velocity.
- **🛠️ Creator Dashboard**: A premium, responsive interface to manage banned words, toggle filters, and manually moderate messages.
- **🔗 Link Protection**: Strict penalties for unauthorized links to keep your chat safe from phishing and scams.
- **⚡ Real-time Updates**: Powered by Socket.io for zero-latency moderation actions and chat feed.

---

## 🚀 Tech Stack

### Backend
- **Node.js & Express**: Core API and server logic.
- **Google APIs**: Integration with YouTube Live Chat API.
- **Socket.io**: Real-time bi-directional communication.
- **OAuth2**: Secure authentication with Google.

### Frontend
- **React 19**: Modern UI component architecture.
- **Vite**: Ultra-fast build tool and development server.
- **Lucide React**: Beautiful icon set for a premium feel.
- **CSS3**: Custom-styled dashboard with modern aesthetics.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- A Google Cloud Project with the **YouTube Data API v3** enabled.
- OAuth2 Client Credentials from Google Cloud Console.

### 1. Clone the Repository
```bash
git clone https://github.com/Abhinav002K474/Youtube-Moderator-Bot-
cd Youtube-Moderator-Bot-
```

### 2. Backend Configuration
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder and add your credentials:
```env
PORT=3001
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3001/oauth2callback
```

### 3. Frontend Configuration
Navigate to the `frontend` directory and install dependencies:
```bash
cd ../frontend
npm install
```

### 4. Run the Application
Start the backend:
```bash
cd ../backend
npm start
```
Start the frontend:
```bash
cd ../frontend
npm run dev
```

---

## ⚙️ Configuration

The bot's behavior can be customized through the dashboard settings:
- **Spam Filter**: Toggle automated filtering on/off.
- **Strict Mode**: Enable more aggressive penalty systems.
- **Banned Words**: Add/remove keywords that should be automatically flagged.
- **Rate Limit**: Control the allowed frequency of messages per user.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

Abhinav - [@your_twitter](https://twitter.com/your_twitter)

Project Link: [https://github.com/Abhinav002K474/Youtube-Moderator-Bot-](https://github.com/Abhinav002K474/Youtube-Moderator-Bot-)

---
*Built with ❤️ for the streaming community.*
