import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Zap,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Layers,
  Terminal,
  Cpu
} from 'lucide-react';
import { copilotAPI } from '../../services/api';

export default function RiskCopilot({ isOpen, onClose, onOpenTransaction, onOpenCustomer, onOpenDevice }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg_welcome',
      sender: 'copilot',
      text: "👋 Hi, I'm **RiskShield Copilot**. I'm connected to your live transaction telemetry, graph clusters, and ML models.\n\nAsk me anything about current risks, priority cases, device syndicates, or anomaly spikes.",
      tools_used: [],
      citations: [],
      suggested_followups: [
        "What should I investigate first?",
        "Why did risk increase today?",
        "Which fraud ring has the highest amount at risk?",
        "Show active device syndicates"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await copilotAPI.chat(text);
      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'copilot',
        text: res.answer || "I don't have enough evidence to determine that.",
        tools_used: res.tools_used || [],
        citations: res.citations || [],
        suggested_followups: res.suggested_followups || []
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'copilot',
          text: "⚠️ I encountered an error connecting to the risk intelligence engine. Please try again.",
          tools_used: [],
          citations: [],
          suggested_followups: ["What should I investigate first?"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Risk Copilot</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                GROUNDED LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Analyst AI connected to database & models</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}
            >
              {/* Tool Execution Badges */}
              {m.tools_used && m.tools_used.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-slate-800">
                  {m.tools_used.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 font-mono text-[10px] flex items-center gap-1"
                    >
                      <Terminal className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Message text with basic markdown formatting */}
              <div className="whitespace-pre-wrap space-y-1">
                {m.text.split('\n').map((line, lIdx) => {
                  if (line.startsWith('### ')) {
                    return <h4 key={lIdx} className="font-bold text-white text-xs mt-1 mb-1">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('- ')) {
                    return <p key={lIdx} className="pl-2 text-slate-300">• {line.replace('- ', '')}</p>;
                  }
                  return <p key={lIdx}>{line}</p>;
                })}
              </div>

              {/* Citations & Jump Links */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Inspect:</span>
                  {m.citations.map((cite, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => {
                        if (cite.startsWith('TXN_') && onOpenTransaction) onOpenTransaction(cite);
                        else if (cite.startsWith('USR_') && onOpenCustomer) onOpenCustomer(cite);
                        else if (cite.startsWith('DEV_') && onOpenDevice) onOpenDevice(cite);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <span>{cite}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Followups */}
            {m.suggested_followups && m.suggested_followups.length > 0 && m.sender === 'copilot' && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                {m.suggested_followups.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSend(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 text-slate-300 hover:text-white text-[11px] transition-all text-left"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 text-xs w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Querying risk evidence tools & reasoning...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Copilot about any transaction, device, cluster, or anomaly..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
