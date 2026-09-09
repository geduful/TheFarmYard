'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendedResources?: Array<{ title: string; slug: string; summary: string | null; category: string | null }>;
  featureSuggestions?: Array<{ name: string; href: string; description: string }>;
  sourcesUsed?: boolean;
  poweredBy?: 'ai' | 'knowledge-base';
}

interface AiChatProps {
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  'How do I reduce post-harvest losses for maize?',
  'What is the best way to store cassava?',
  'How should I price my farm produce?',
  'How can I find buyers for my crops?',
  'What fertiliser should I use for vegetables?',
];

export default function AiChat({ className = '' }: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your Agricultural Assistant. I can help you with:\n\n- **Crop production** — growing maize, rice, cassava, yam, vegetables\n- **Post-harvest handling** — drying, storage, reducing losses\n- **Farm business** — pricing, finding buyers, record keeping\n- **Storage & logistics** — warehousing, transportation\n- **TheFarmYard features** — marketplace, listings, storage\n\nI search our knowledge base of agricultural articles to answer your questions. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend(message?: string) {
    const text = (message || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/learning/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to get response. Please try again.');
        setLoading(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        recommendedResources: data.recommendedResources,
        featureSuggestions: data.featureSuggestions,
        sourcesUsed: data.sourcesUsed,
        poweredBy: data.poweredBy,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-farm-green text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-base">Agricultural Assistant</h3>
            <p className="text-white/70 text-xs">Ask about farming, storage, pricing, or selling</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
              {/* Message bubble */}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-farm-green text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                {msg.content.split('\n').map((line, j) => {
                  // Bold text
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <span key={j}>
                      {parts.map((part, k) =>
                        k % 2 === 1 ? <strong key={k}>{part}</strong> : part,
                      )}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  );
                })}
              </div>

              {/* Recommended resources */}
              {msg.recommendedResources && msg.recommendedResources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Learn more</p>
                  {msg.recommendedResources.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/learning/${r.slug}`}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
                    >
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-blue-800 group-hover:text-blue-900 truncate">{r.title}</p>
                        {r.summary && <p className="text-xs text-blue-600/70 line-clamp-1 mt-0.5">{r.summary}</p>}
                        {r.category && <p className="text-xs text-blue-500 mt-0.5">{r.category}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* TheFarmYard feature suggestions */}
              {msg.featureSuggestions && msg.featureSuggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On TheFarmYard</p>
                  {msg.featureSuggestions.map((f) => (
                    <Link
                      key={f.href}
                      href={f.href}
                      className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group border border-emerald-200/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015A3.001 3.001 0 0021 9.35V3.75" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800 group-hover:text-emerald-900">{f.name}</p>
                        <p className="text-xs text-emerald-600/70">{f.description}</p>
                      </div>
                      <svg className="w-4 h-4 text-emerald-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions (only when no messages besides welcome) */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-400 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-farm-green hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about farming, storage, pricing..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green/50 max-h-24 placeholder-gray-400"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-farm-green text-white flex items-center justify-center hover:bg-farm-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Answers sourced from our agricultural knowledge base. Always verify critical advice with local experts.
        </p>
      </div>
    </div>
  );
}
