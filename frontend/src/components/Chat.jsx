import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config";
import ReactMarkdown from 'react-markdown';

export default function Chat({ teamId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ai/chat/${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages, // history before this message
          userMessage: trimmed,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      setMessages(data.messages); // backend returns full updated history
    } catch {
      setError("Something went wrong. Try again.");
      setMessages(updatedMessages); // keep user message visible
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[500px] border border-gray-700 rounded-xl bg-gray-900 mt-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-white font-semibold text-sm">FPL Assistant</h2>
        <p className="text-gray-400 text-xs">Ask anything about your squad</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">
            Ask me about transfers, captaincy, or your squad...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown
                    components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-100">{children}</li>,
                        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                        h3: ({ children }) => <h3 className="text-green-400 font-semibold mt-3 mb-1">{children}</h3>,
                    }}
                >
                    {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-400 rounded-lg px-3 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-700 flex gap-2">
        <textarea
          className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 resize-none outline-none border border-gray-600 focus:border-green-500"
          rows={1}
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}