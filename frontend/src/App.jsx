import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Globe, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your automation assistant. Enter a URL to start, then tell me what to do.' }
  ]);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const refreshScreenshot = () => {
    setScreenshotUrl(`${API_BASE}/screenshot?t=${Date.now()}`);
  };

  const processState = (state) => {
    if (state && state.needsLogin) {
      let prompt = `I noticed this page might need a login (Title: "${state.title}"). `;
      if (state.loginButtons.length > 0) {
        const btns = state.loginButtons.slice(0, 3).join(', ');
        prompt += `I see buttons like: ${btns}. `;
      }
      if (state.hasEmailField) {
        prompt += `Would you like me to type your email and password? Just type them here!`;
      } else {
        prompt += `Should I try clicking one of those buttons for you?`;
      }
      setMessages(prev => [...prev, { role: 'bot', text: prompt }]);
    }
  };

  const handleNavigate = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      const isUrl = url.includes('.') || url.startsWith('http') || url.startsWith('localhost');

      if (isUrl) {
        const res = await axios.post(`${API_BASE}/navigate`, { url });
        setMessages(prev => [...prev, { role: 'user', text: `Go to ${url}` }, { role: 'bot', text: `Browsing ${url}...` }]);
        processState(res.data.data?.state);
      } else {
        const res = await axios.post(`${API_BASE}/command`, { command: `search ${url}` });
        setMessages(prev => [...prev, { role: 'user', text: `Search for "${url}"` }, { role: 'bot', text: `Searching Google for "${url}"...` }]);
        processState(res.data.data?.state);
      }
      refreshScreenshot();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.response?.data?.message || err.message}` }]);
    }
    setLoading(false);
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!command) return;
    const userMsg = command;
    setCommand('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/command`, { command: userMsg });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.message }]);

      // If the command returned a state, process it
      if (res.data.data?.state) {
        processState(res.data.data.state);
      }

      setTimeout(refreshScreenshot, 1000);
      setTimeout(refreshScreenshot, 3000);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Failed: ${err.response?.data?.message || err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      {/* LEFT SIDEBAR - CHAT */}
      <div className="sidebar">
        <div className="sidebar-header">
          <MessageSquare className="text-accent" />
          <h2>AutoBot Chat</h2>
        </div>

        <div className="chat-history">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-container">
          <form className="chat-input-wrapper" onSubmit={handleCommand}>
            <input
              type="text"
              placeholder="e.g. click Login..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button type="submit" className="send-btn" disabled={loading}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL - BROWSER */}
      <div className="browser-view">
        <div className="browser-toolbar">
          <div className="flex gap-2">
            <ChevronLeft className="opacity-50" />
            <ChevronRight className="opacity-50" />
            <RefreshCw size={18} className="cursor-pointer hover:rotate-180 transition-all" onClick={refreshScreenshot} />
          </div>
          <form className="url-bar" onSubmit={handleNavigate}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Enter URL or search..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </form>
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-accent" />
          </div>
        </div>

        <div className="browser-content">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt="Browser View"
              className="browser-screenshot"
            />
          ) : (
            <div className="text-gray-500 text-center">
              <Globe size={48} className="mx-auto mb-4 opacity-20" />
              <p>No active session. Enter a URL above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
