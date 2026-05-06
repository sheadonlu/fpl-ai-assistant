import { useState } from 'react';
import axios from 'axios';
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
    <div>
      <h2>AI Advice</h2>
      <button onClick={fetchAdvice} disabled={loading}>
        {loading ? 'Thinking...' : 'Get AI Advice'}
      </button>
      {advice && <p style={{ whiteSpace: 'pre-wrap' }}>{advice}</p>}
    </div>
  );
}

export default AIAdvice;