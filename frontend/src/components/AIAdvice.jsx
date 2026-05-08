import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { API_BASE } from '../config';

function AIAdvice({ teamId }) {
  const [advice, setAdvice] = useState(null);
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

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold text-white mb-4">AI Advice</h2>
      <button
        onClick={fetchAdvice}
        disabled={loading}
        className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold rounded-lg px-6 py-2 transition-colors"
      >
        {loading ? 'Thinking...' : 'Get AI Advice'}
      </button>
      {advice && (
        <div className="mt-4 text-gray-300 text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              h3: ({ children }) => <h3 className="text-green-400 font-semibold text-base mt-4 mb-2">{children}</h3>,
              h2: ({ children }) => <h2 className="text-green-400 font-bold text-lg mt-4 mb-2">{children}</h2>,
            }}
          >
            {advice}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default AIAdvice;