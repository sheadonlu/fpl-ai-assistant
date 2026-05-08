import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE } from '../config';

const mdComponents = {
  p:      ({ children }) => <p>{children}</p>,
  ul:     ({ children }) => <ul>{children}</ul>,
  ol:     ({ children }) => <ol>{children}</ol>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong>{children}</strong>,
  h3:     ({ children }) => <h3>{children}</h3>,
};

const CAPABILITIES = [
  'Captain & vice-captain recommendations',
  'Transfer targets with fixture context',
  'Chip timing & wildcard planning',
  'Differential picks for rank climbing',
  'Bench order optimisation',
];

export default function Chat({ teamId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg        = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ai/chat/${teamId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages, userMessage: trimmed }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      setError('Something went wrong. Try again.');
      setMessages(updatedMessages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fpl-chat-layout">
      {/* Left info panel */}
      <div className="fpl-chat-info">
        <div>
          <h3 className="fpl-chat-info-title">
            Your personal<br /><em>FPL analyst.</em>
          </h3>
          <p className="fpl-chat-info-copy">
            Ask anything about your squad. The AI has full context of your
            players, upcoming fixtures, form ratings, and available transfers.
          </p>
          <div className="fpl-chat-caps">
            {CAPABILITIES.map((cap, i) => (
              <div key={i} className="fpl-chat-cap">
                <span className="fpl-chat-cap-dot" />
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right chat window */}
      <div className="fpl-chat-window">
        <div className="fpl-chat-messages">
          {messages.length === 0 && (
            <p className="fpl-chat-empty">
              Ask about transfers, captaincy,<br />chips, or your squad…
            </p>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="fpl-chat-msg">
              <span className={`fpl-chat-msg-meta ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role === 'user' ? 'You' : 'FPL AI'}
              </span>
              <div className={`fpl-chat-bubble${msg.role === 'user' ? ' user' : ''}`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown components={mdComponents}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="fpl-chat-msg">
              <span className="fpl-chat-msg-meta ai">FPL AI</span>
              <div className="fpl-chat-thinking">
                <div className="fpl-thinking-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {error && <p className="fpl-chat-error">{error}</p>}

          <div ref={bottomRef} />
        </div>

        <div className="fpl-chat-input-row">
          <textarea
            className="fpl-chat-input"
            rows={1}
            placeholder="Ask something…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="fpl-chat-send"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            Send ↑
          </button>
        </div>
      </div>
    </div>
  );
}