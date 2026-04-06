"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, BarChart3, Users, Globe, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: Record<string, unknown>;
  loading?: boolean;
}

const SUGGESTED_PROMPTS = [
  { icon: BarChart3, text: "What's my Stellar revenue?" },
  { icon: Globe, text: "Compare Base vs Stellar revenue" },
  { icon: Users, text: "Which agents chain multiple services?" },
  { icon: TrendingUp, text: "How is my revenue trending?" },
  { icon: AlertTriangle, text: "Are any agents at risk of churning?" },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: query };
    const loadingMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/pulse/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: data.response || "I couldn't process that query.", data: data.data, loading: false }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: "Something went wrong. Please try again.", loading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-57px)] min-h-0">
      {/* Header */}
      <div className="border-b border-black/[0.04] px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pulse" />
          <h1 className="text-[16px] font-semibold tracking-tight">Pulse Copilot</h1>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pulse-50 text-pulse-600 uppercase tracking-wider">AI</span>
        </div>
        <p className="text-[12px] text-tertiary mt-0.5">Ask anything about your x402 revenue, customers, and endpoints.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-pulse-50 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-pulse" />
            </div>
            <h2 className="text-[17px] font-semibold mb-1">Ask Pulse Copilot</h2>
            <p className="text-[13px] text-tertiary mb-6 max-w-md">
              Your AI assistant for x402 revenue intelligence. Ask about revenue, customers, endpoints, pricing, or trends.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => handleSend(p.text)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/[0.06] bg-white hover:bg-[#FAFAFA] text-[12px] text-secondary hover:text-primary transition-all shadow-sm"
                >
                  <p.icon className="w-3 h-3 text-quaternary" />
                  {p.text}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-foreground text-white rounded-br-md"
                    : "bg-[#F5F5F5] text-primary rounded-bl-md"
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-quaternary" />
                    <span className="text-[13px] text-quaternary">Analyzing your data...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.data && <CopilotDataView data={msg.data} />}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-black/[0.04] px-6 py-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your x402 revenue..."
            disabled={loading}
            className="flex-1 h-10 px-4 rounded-xl border border-black/[0.08] bg-white text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-foreground text-white flex items-center justify-center hover:bg-foreground/90 disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CopilotDataView({ data }: { data: Record<string, unknown> }) {
  // Render inline data tables/stats from the copilot response
  if (data.stats) {
    const s = data.stats as Record<string, number>;
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(s).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/80 p-2">
            <p className="text-[10px] text-quaternary capitalize">{k.replace(/_/g, " ")}</p>
            <p className="text-[13px] font-semibold font-mono-numbers">
              {typeof v === "number" && k.includes("revenue") ? formatCurrency(v) : String(v)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (data.endpoints && Array.isArray(data.endpoints)) {
    return (
      <div className="mt-3 space-y-1">
        {(data.endpoints as Array<Record<string, unknown>>).slice(0, 5).map((ep, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-black/[0.04] last:border-0">
            <span className="font-mono">{String(ep.path || ep.endpoint)}</span>
            <span className="font-mono-numbers font-medium">{formatCurrency(Number(ep.revenue || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  if (data.customers && Array.isArray(data.customers)) {
    return (
      <div className="mt-3 space-y-1">
        {(data.customers as Array<Record<string, unknown>>).slice(0, 5).map((c, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-black/[0.04] last:border-0">
            <span className="font-mono">{String(c.address || "").slice(0, 12)}...</span>
            <span className="font-mono-numbers font-medium">{formatCurrency(Number(c.total_spent || 0))}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
