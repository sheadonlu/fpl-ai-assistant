import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { API_BASE } from '../config';

// Split a single markdown string into up to 4 logical chunks for the grid cells.
// Falls back gracefully if the AI returns one big blob.
function parseAdviceIntoChunks(text) {
  // Try splitting on markdown h2/h3 headings
  const headingRegex = /(?=^#{2,3} )/m;
  const parts = text.split(headingRegex).filter(Boolean);

  if (parts.length >= 2) {
    // Pad or trim to 4
    while (parts.length < 4) parts.push('');
    return parts.slice(0, 4);
  }

  // Fallback: split on double newlines into paragraphs, group them
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const size = Math.ceil(paragraphs.length / 4);
  const chunks = [];
  for (let i = 0; i < 4; i++) {
    chunks.push(paragraphs.slice(i * size, (i + 1) * size).join('\n\n'));
  }
  return chunks;
}

const TAGS = [
  { label: 'Captain pick',    className: '' },
  { label: 'Transfer advice', className: 'warn' },
  { label: 'Chip strategy',   className: '' },
  { label: 'Fixture view',    className: 'neutral' },
];

const mdComponents = {
  p:      ({ children }) => <p>{children}</p>,
  ul:     ({ children }) => <ul>{children}</ul>,
  ol:     ({ children }) => <ol>{children}</ol>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong>{children}</strong>,
  h2:     ({ children }) => <h2>{children}</h2>,
  h3:     ({ children }) => <h3>{children}</h3>,
};

export default function AIAdvice({ teamId }) {
  const [advice, setAdvice]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchAdvice() {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/ai/advice/${teamId}`);
      setAdvice(data.advice);
    } catch {
      setAdvice('Could not fetch advice. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Pre-fetch state
  if (!advice && !loading) {
    return (
      <div className="fpl-advice-grid">
        <div className="fpl-advice-fetch-wrap">
          <button className="fpl-advice-fetch-btn" onClick={fetchAdvice}>
            Generate AI Analysis →
          </button>
          <span className="fpl-advice-fetch-hint">
            Analyses your full squad, fixtures, and form in one go
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fpl-advice-grid">
        <div className="fpl-advice-fetch-wrap">
          <span className="fpl-advice-fetch-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Analysing your squad…
          </span>
        </div>
      </div>
    );
  }

  const chunks = parseAdviceIntoChunks(advice);

  return (
    <div className="fpl-advice-grid">
      {TAGS.map((tag, i) => (
        <div className="fpl-advice-cell" key={i}>
          <div className={`fpl-advice-tag ${tag.className}`}>{tag.label}</div>
          {chunks[i] ? (
            <div className="fpl-advice-body">
              <ReactMarkdown components={mdComponents}>
                {chunks[i]}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="fpl-advice-body" style={{ color: 'var(--cream-dimmer)', fontStyle: 'italic' }}>
              No specific advice for this category.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}