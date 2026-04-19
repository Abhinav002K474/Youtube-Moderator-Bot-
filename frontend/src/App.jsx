import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Shield, ShieldAlert, Activity, Settings2, Trash2, Clock, Terminal, Check, X, Command, EyeOff, Play, Users, MessageSquare, TrendingUp, ThumbsUp, Radio, Crown, AlertTriangle, Cat } from 'lucide-react';
import './index.css';

const SOCKET_URL = "https://youtube-moderator-bot.onrender.com";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [targetChannelId, setTargetChannelId] = useState('');
  const [analytics, setAnalytics] = useState({
    isLive: false, viewers: 0, likes: 0, subs: 0, messages: 0, uniqueUsers: 0, newUsers: 0, subGrowth: 0
  });
  const [activeAlert, setActiveAlert] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('settings_updated', (newSettings) => setSettings(newSettings));
    socket.on('auth_status', ({ success }) => setIsAuth(success));
    socket.on('analytics_update', (data) => setAnalytics(data));
    
    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg].slice(-100));
    });

    socket.on('moderation_event', (event) => {
      setLogs((prev) => [{ ...event, timestamp: new Date() }, ...prev].slice(0, 50));
    });

    socket.on('creator_alert', (alertData) => {
      setActiveAlert(alertData);
      setTimeout(() => setActiveAlert(null), 8000);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSetting = async (key) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await axios.post(`${SOCKET_URL}/api/settings`, updated);
  };

  const addWord = async (e) => {
    if (e.key === 'Enter' && newWord.trim() !== '') {
      if (settings?.bannedWords.includes(newWord.trim().toLowerCase())) return;
      const updated = { ...settings, bannedWords: [...settings.bannedWords, newWord.trim().toLowerCase()] };
      setSettings(updated);
      setNewWord('');
      await axios.post(`${SOCKET_URL}/api/settings`, updated);
    }
  };

  const removeWord = async (wordToRemove) => {
    const updated = { ...settings, bannedWords: settings.bannedWords.filter((w) => w !== wordToRemove) };
    setSettings(updated);
    await axios.post(`${SOCKET_URL}/api/settings`, updated);
  };

  const manualAction = async (action, userId, messageId) => {
    try {
      await axios.post(`${SOCKET_URL}/api/mod/action`, { action, userId, messageId });
      if (action === 'delete') {
         setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error(err);
      alert("Error: Make sure you are authenticated with YouTube.");
    }
  };

  const handleAuth = async () => {
    try {
      const res = await axios.get(`${SOCKET_URL}/api/auth/url`);
      window.open(res.data.url, 'YouTube Auth', 'width=600,height=700');
    } catch (err) {
      console.error(err);
    }
  };

  const startPolling = async () => {
    try {
      await axios.post(`${SOCKET_URL}/api/live/start`, { targetChannelId });
    } catch (err) {
      alert("Failed to start stream: " + (err.response?.data?.error || err.message));
    }
  };

  if (!isConnected || !settings) {
    return (
      <div className="overlay">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)' }}>Connecting to Moderation Engine...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dynamic Alert Banner */}
      {activeAlert && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger)', color: 'white', padding: '16px 24px', borderRadius: '12px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4)', animation: 'slideIn 0.3s ease-out' }}>
          <AlertTriangle size={24} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{activeAlert.title}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>{activeAlert.message}</p>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <div className="glass-panel controls-section">
        <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield className="glow-icon-danger" size={34} style={{ fill: '#dc2626', color: '#dc2626', position: 'absolute' }} />
            <Cat size={20} color="#050505" style={{ fill: '#050505', position: 'absolute', zIndex: 1, marginTop: '2px' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '1px' }}>BLACK CAT</span>
        </div>
        
        {/* Connection Auth Card */}
        <div className="control-group" style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
          {!isAuth ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                You must login to grant moderation permissions.
              </p>
              <button 
                onClick={handleAuth}
                style={{ 
                  width: '100%', padding: '10px', background: '#ff0000', color: 'white', 
                  border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' 
                }}>
                <Play size={18} /> Connect YouTube
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '12px' }}>
                <Check size={18} /> <strong>YouTube Connected</strong>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Target Channel ID (UC...)" 
                  value={targetChannelId} 
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                />
              </div>
              <button 
                onClick={startPolling}
                style={{ 
                  width: '100%', padding: '8px', background: 'var(--primary)', color: 'white', 
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' 
                }}>
                Attach to Stream
              </button>
            </>
          )}
        </div>

        <div className="control-group">
          <div className="toggle-wrapper" onClick={() => toggleSetting('spamFilter')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color={settings.spamFilter ? 'var(--primary)' : 'var(--text-muted)'} /> Auto-Mod
            </span>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.spamFilter} readOnly />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="control-group" style={{ marginTop: '16px' }}>
          <span className="control-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Banned Phrase Matrix
            <span style={{ color: 'var(--danger)' }}>{settings.bannedWords.length} Active</span>
          </span>
          <div className="word-tags">
            {settings.bannedWords.map((word) => (
              <span key={word} className="word-tag">
                {word} <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeWord(word)} />
              </span>
            ))}
          </div>
          <input
            type="text"
            className="add-word-input"
            placeholder="Add keyword and press Enter..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={addWord}
          />
        </div>
      </div>

      {/* Middle - Feed */}
      <div className="glass-panel chat-feed-container" style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Analytics Bar */}
        <div className="analytics-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border)' }}>
            <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Radio size={14} color={analytics.isLive ? 'var(--success)' : 'var(--text-muted)'} /> Status</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem', color: analytics.isLive ? 'var(--success)' : 'var(--text-muted)' }}>{analytics.isLive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Viewers</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{analytics.viewers.toLocaleString()}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><ThumbsUp size={14} /> Likes</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{analytics.likes.toLocaleString()}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} /> Subs (Growth)</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{analytics.subs.toLocaleString()} <span style={{fontSize: '0.85rem', color: 'var(--success)'}}>+{analytics.subGrowth}</span></span>
            </div>
            <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={14} /> Msgs Processed</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{analytics.messages.toLocaleString()}</span>
            </div>
             <div className="stat-box">
              <span className="stat-label" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} /> Unique Users</span>
              <span className="stat-value" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{analytics.uniqueUsers.toLocaleString()}</span>
            </div>
        </div>

        <div className="panel-header" style={{ marginBottom: '12px' }}>
          <Activity className="glow-icon" size={24} />
          <span>Live Chat Feed</span>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Command size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>{isAuth ? 'Awaiting stream metrics...' : 'Connect YouTube account to begin'}</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id + idx} className={`chat-message ${msg.isSpam ? 'spam' : ''}`}>
                <img src={msg.authorDetails.profileImageUrl} alt="avatar" className="avatar" />
                <div className="message-content">
                  <div className="message-header">
                    <span className="username">
                      {msg.authorDetails.displayName}
                      {msg.authorDetails.isChatModerator && <Shield size={12} style={{ marginLeft: 6, color: 'var(--primary)' }} title="Moderator" />}
                      {msg.trustScore >= 180 && <Crown size={14} style={{ marginLeft: 6, color: '#fbbf24' }} title={`Trusted Loyal User (Score: ${msg.trustScore})`} />}
                      {msg.trustScore <= 50 && <AlertTriangle size={14} style={{ marginLeft: 6, color: '#f87171' }} title={`Risky User (Score: ${msg.trustScore})`} />}
                    </span>
                    <span className="timestamp">{new Date(msg.snippet.publishedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="message-text">
                    {msg.snippet.displayMessage}
                  </div>
                  {msg.isSpam && (
                    <div className="spam-reasons">
                      <ShieldAlert size={14} />
                      {msg.flags.join(' • ')}
                    </div>
                  )}
                  <div className="message-actions">
                    <button className="action-btn delete" onClick={() => manualAction('delete', msg.authorDetails.channelId, msg.id)}>
                      <Trash2 size={14} /> Purge
                    </button>
                    <button className="action-btn timeout" onClick={() => manualAction('timeout', msg.authorDetails.channelId, msg.id)}>
                      <Clock size={14} /> Timeout
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Right Sidebar - Logs */}
      <div className="glass-panel">
        <div className="panel-header" style={{ borderBottomColor: 'var(--border)' }}>
          <Terminal className="glow-icon-danger" size={24} />
          <span>Action Logs</span>
        </div>
        
        <div className="mod-log-list">
          {logs.map((log, i) => (
            <div key={i} className={`log-entry ${log.type}`}>
              <span className="log-time">{log.timestamp.toLocaleTimeString()}</span>
              <strong>[{log.type}]</strong> {log.user.substring(0, 15)}
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Reason: {log.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
