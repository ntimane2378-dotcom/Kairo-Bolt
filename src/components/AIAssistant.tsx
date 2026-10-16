import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Trash2, X } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { getChatHistory, saveChatMessage, clearChatHistory } from '@/lib/db';
import { processAICommand, type AIResponse } from '@/lib/ai-assistant';
interface AIAssistantProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (id: string, type: string) => void;
  onAlertCreated?: () => void;
  onWatchlistChanged?: () => void;
}

export function AIAssistant({ open, onClose, onNavigate, onAlertCreated, onWatchlistChanged }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Show market overview',
    'Analyze Bitcoin',
    'Alert me when BTC drops below $60,000',
    'Add Ethereum to my watchlist',
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatHistory().then((history) => {
      if (history.length === 0) {
        const greeting: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your AI market assistant. I can help you set price alerts, manage your watchlist, and analyze any crypto or stock. What would you like to do?",
          created_at: new Date().toISOString(),
        };
        setMessages([greeting]);
      } else {
        setMessages(history);
      }
    }).catch(() => {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI market assistant. How can I help you today?",
        created_at: new Date().toISOString(),
      }]);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    await saveChatMessage('user', text).catch(() => {});

    try {
      const response: AIResponse = await processAICommand(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await saveChatMessage('assistant', response.text).catch(() => {});

      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }

      if (response.action) {
        if (response.action.type === 'navigate' && onNavigate) {
          const payload = response.action.payload as { id: string; type: string };
          setTimeout(() => {
            onNavigate(payload.id, payload.type);
            onClose();
          }, 800);
        }
        if (response.action.type === 'alert_created' && onAlertCreated) {
          onAlertCreated();
        }
        if (response.action.type === 'watchlist_added' || response.action.type === 'watchlist_removed') {
          if (onWatchlistChanged) onWatchlistChanged();
        }
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I encountered an error processing your request. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await clearChatHistory().catch(() => {});
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared. How can I help you?",
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-slate-950 border-l border-slate-800 z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">AI Assistant</h3>
              <p className="text-xs text-slate-500">Alerts, watchlist & analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input); }}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
