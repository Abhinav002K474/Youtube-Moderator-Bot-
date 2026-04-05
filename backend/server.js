require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory state
let settings = {
  spamFilter: true,
  strictMode: false,
  bannedWords: ['scam', 'click here', 'free robux', 'crypto'],
  rateLimit: 5 
};
let userStates = {}; // Maps channelId -> { count, lastMsg, trustScore }
let recentMessages = []; // Rolling buffer for wave detection

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

let youtubeTokens = null;
let activeLiveChatId = null;
let activeVideoId = null;
let activeChannelId = null;
let nextPageToken = '';
let isPolling = false;

// Analytics State
let seenUsers = new Set();
let messageCount = 0;
let previousSubs = 0;
let currentSubs = 0;
let newSubs = 0;
let viewers = 0;
let likes = 0;
let isLive = false;

// ---------------------------
// OAuth Flow Endpoints
// ---------------------------
app.get('/api/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    youtubeTokens = tokens;
    io.emit('auth_status', { success: true });
    res.send('<h1>Authentication Successful!</h1><p>You can close this window and return to the dashboard.</p><script>window.close()</script>');
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.send('Error retrieving access token');
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!youtubeTokens });
});

// ---------------------------
// Spam Detection Logic
// ---------------------------
function checkSpam(messageDetails) {
  const { authorDetails, snippet } = messageDetails;
  const msgText = snippet.displayMessage.toLowerCase();
  let flags = [];

  settings.bannedWords.forEach(word => {
    if (msgText.includes(word)) flags.push(`Banned word: "${word}"`);
  });

  const emojiCount = (snippet.displayMessage.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
  if (emojiCount > 5) flags.push('Excessive emojis');

  // Removed old simple rate limit, now handled by Sliding Window Engine
  return flags;
}

// ---------------------------
// Real YouTube Poller
// ---------------------------
app.post('/api/live/start', async (req, res) => {
  if (!youtubeTokens) return res.status(401).json({ error: 'Not authenticated with YouTube' });
  
  if (!isPolling) {
    isPolling = true;
    try {
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelRes = await youtube.channels.list({ part: 'id', mine: true });
      if (!channelRes.data.items || channelRes.data.items.length === 0) {
        throw new Error('No YouTube channel found for this auth account.');
      }
      activeChannelId = channelRes.data.items[0].id;
      
      await initializeStreamData();
      pollChat();
      pollMetrics();
      pollSubscribers();
      res.json({ success: true, message: 'Started polling live stream' });
    } catch (err) {
      isPolling = false;
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ success: true, message: 'Already polling' });
  }
});

function emitAnalytics() {
  io.emit('analytics_update', {
    isLive,
    viewers,
    likes,
    subs: currentSubs,
    messages: messageCount,
    uniqueUsers: seenUsers.size,
    newUsers: seenUsers.size,
    subGrowth: newSubs
  });
}

async function initializeStreamData() {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  
  const searchRes = await youtube.search.list({
    part: 'snippet',
    channelId: activeChannelId,
    eventType: 'live',
    type: 'video'
  });
  
  if (!searchRes.data.items || searchRes.data.items.length === 0) {
    throw new Error('No active live stream found for this channel.');
  }
  
  activeVideoId = searchRes.data.items[0].id.videoId;
  isLive = true;
  
  const videoRes = await youtube.videos.list({
    part: 'liveStreamingDetails,statistics',
    id: activeVideoId
  });
  
  const videoDetails = videoRes.data.items[0];
  if (!videoDetails) throw new Error('Video details not found');
  
  activeLiveChatId = videoDetails.liveStreamingDetails.activeLiveChatId;
  viewers = parseInt(videoDetails.liveStreamingDetails.concurrentViewers || 0);
  likes = parseInt(videoDetails.statistics.likeCount || 0);
  
  const channelRes = await youtube.channels.list({
    part: 'statistics',
    id: activeChannelId
  });
  
  currentSubs = parseInt(channelRes.data.items[0].statistics.subscriberCount || 0);
  previousSubs = currentSubs;
  
  emitAnalytics();
}

async function pollMetrics() {
  if (!isPolling || !activeVideoId) return;
  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const videoRes = await youtube.videos.list({
      part: 'liveStreamingDetails,statistics',
      id: activeVideoId
    });
    const details = videoRes.data.items[0];
    if (details) {
      viewers = parseInt(details.liveStreamingDetails?.concurrentViewers || 0);
      likes = parseInt(details.statistics?.likeCount || 0);
      emitAnalytics();
    }
  } catch(e) { console.error('Metrics poll error', e.message); }
  setTimeout(pollMetrics, 10000);
}

async function pollSubscribers() {
  if (!isPolling || !activeChannelId) return;
  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: 'statistics',
      id: activeChannelId
    });
    const newCount = parseInt(channelRes.data.items[0].statistics.subscriberCount || 0);
    newSubs = newCount - previousSubs; // Growth during session
    currentSubs = newCount;
    emitAnalytics();
  } catch(e) { console.error('Sub poll error', e.message); }
  setTimeout(pollSubscribers, 60000);
}

async function pollChat() {
  if (!isPolling || !activeLiveChatId || !youtubeTokens) return;
  
  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.liveChatMessages.list({
      liveChatId: activeLiveChatId,
      part: 'snippet,authorDetails',
      maxResults: 200,
      pageToken: nextPageToken || undefined
    });

    const messages = response.data.items;
    nextPageToken = response.data.nextPageToken;
    const pollingIntervalMillis = response.data.pollingIntervalMillis || 2000;

    for (const message of messages) {
      await processYoutubeMessage(message);
    }
    
    // Throttle analytics emit rather than emitting for every single message
    if (messages.length > 0) emitAnalytics();

    setTimeout(pollChat, pollingIntervalMillis);
  } catch (error) {
    console.error('Error polling YouTube chat:', error.message);
    isPolling = false;
  }
}

async function processYoutubeMessage(message) {
  let isSpam = false;
  let flags = [];
  
  messageCount++;
  const userId = message.authorDetails.channelId;
  seenUsers.add(userId);
  
  const now = Date.now();
  if (!userStates[userId]) {
    userStates[userId] = { count: 0, lastMsg: now, trustScore: 100 };
  }
  
  // Clean old recent messages for wave detection (older than 30s)
  recentMessages = recentMessages.filter(m => now - m.timestamp < 30000);
  
  const textNorm = message.snippet.displayMessage.toLowerCase().trim();
  recentMessages.push({ text: textNorm, userId, messageId: message.id, timestamp: now });
  
  const waveMatches = recentMessages.filter(m => m.text === textNorm);
  const uniqueUsersInWave = new Set(waveMatches.map(m => m.userId));
  
  let isWave = false;
  if (waveMatches.length >= 5 && uniqueUsersInWave.size >= 3) {
    isWave = true;
    io.emit('creator_alert', { title: 'Spam Wave Detected', message: `Pattern: "${textNorm}"` });
  }
  
  if (settings.spamFilter && !message.authorDetails.isChatModerator) {
    flags = checkSpam(message);
    if (isWave) flags.push('SPAM WAVE ATTACK');
    
    // Strict Penalty for links
    if (textNorm.includes('http') || textNorm.includes('www.')) {
      userStates[userId].trustScore -= 30; // Heavy penalty for links if unapproved
    }
    
    if (flags.length > 0) {
      isSpam = true;
      userStates[userId].trustScore -= 20;
      console.log(`[SPAM BLOCKED] ${message.authorDetails.displayName}: ${message.snippet.displayMessage}`);
      
      try {
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        await youtube.liveChatMessages.delete({ id: message.id });
        io.emit('moderation_event', {
          type: 'AUTO_DELETE',
          messageId: message.id,
          user: message.authorDetails.displayName,
          reason: flags.join(', ')
        });
        
        // Auto Restrict low-score users
        if (userStates[userId].trustScore <= 0) {
          await youtube.liveChatBans.insert({
            part: 'snippet',
            requestBody: { snippet: { liveChatId: activeLiveChatId, type: 'temporary', banDurationSeconds: 300, bannedUserDetails: { channelId: userId } } }
          });
          userStates[userId].trustScore = 50; // Reset to 50 so they don't immediately get banned again upon return
          io.emit('moderation_event', {
            type: 'AUTO_TIMEOUT',
            messageId: message.id,
            user: message.authorDetails.displayName,
            reason: 'Trust score dropped <= 0 (Repeated Spam/Wave)'
          });
          io.emit('creator_alert', { title: 'User Auto-Restricted', message: `User ${message.authorDetails.displayName} timed out due to low trust score.` });
        }
      } catch (err) {
        console.error('Failed automated action on YouTube:', err.message);
      }
    } else {
      userStates[userId].trustScore = Math.min(200, userStates[userId].trustScore + 2);
    }
  }

  io.emit('new_message', { ...message, isSpam, flags, trustScore: userStates[userId].trustScore });
}

// ---------------------------
// Dashboard Endpoints
// ---------------------------
app.get('/api/settings', (req, res) => res.json(settings));

app.post('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  io.emit('settings_updated', settings);
  res.json({ success: true, settings });
});

app.post('/api/mod/action', async (req, res) => {
  const { action, userId, messageId } = req.body;
  
  if (!youtubeTokens) {
     return res.status(401).json({ error: 'Not authenticated with YouTube' });
  }

  try {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    if (action === 'delete') {
      await youtube.liveChatMessages.delete({ id: messageId });
    } else if (action === 'timeout') {
      // YouTube timeout requires inserting a liveChatBan resource
      await youtube.liveChatBans.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            liveChatId: activeLiveChatId,
            type: 'temporary',
            banDurationSeconds: 300, // 5 minutes
            bannedUserDetails: { channelId: userId } // Requires channel ID
          }
        }
      });
    }

    io.emit('moderation_event', {
      type: action.toUpperCase(),
      messageId,
      user: userId,
      reason: 'Manual action'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Moderation API failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  socket.emit('settings_updated', settings);
  socket.emit('auth_status', { success: !!youtubeTokens });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
