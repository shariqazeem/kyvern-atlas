"use client";

/**
 * ChatDrawer — "talk to your module" sticky drawer, anchored just above
 * the TabBar. Slides up from the bottom edge like a hardware keyboard:
 * handle bar on top, header label, recent bubbles, quick-reply chips,
 * input row with a primary Send.
 *
 * Premium light register; chassis-style top edge so it reads as part
 * of the device rather than a floating modal. Polls and chat state are
 * owned by the parent page — this component is presentational + the
 * input/send mechanic.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.6 };

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

interface ChatDrawerProps {
  agentName: string;
  agentEmoji: string;
  chat: ChatMessage[];
  sending: boolean;
  inputValue: string;
  onChangeInput: (v: string) => void;
  onSend: () => void;
  quickReplies: string[];
}

export function ChatDrawer({
  agentName,
  agentEmoji,
  chat,
  sending,
  inputValue,
  onChangeInput,
  onSend,
  quickReplies,
}: ChatDrawerProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new bubbles
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, sending]);

  const showBubbles = chat.length > 0 || sending;
  const lastIsUser = chat.length > 0 && chat[chat.length - 1].role === "user";

  return (
    <div
      className="fixed bottom-[72px] inset-x-0 z-40 px-5 sm:px-8 max-w-[680px] mx-auto"
      style={{
        // Soft fade above the drawer so thoughts behind it dissolve into
        // the page background instead of cutting off sharply.
        background:
          "linear-gradient(to top, #FAFAFA 78%, rgba(250,250,250,0))",
        paddingTop: 36,
        paddingBottom: 12,
      }}
    >
      {/* The drawer card itself */}
      <motion.div
        layout
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[18px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #FBFBFD 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 -2px 6px rgba(15,23,42,0.03)",
            "0 -10px 28px -8px rgba(15,23,42,0.08)",
          ].join(", "),
        }}
      >
        {/* Top edge highlight */}
        <div
          aria-hidden
          className="absolute top-0 left-8 right-8 pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
          }}
        />

        {/* Drawer handle */}
        <div className="flex justify-center pt-2 pb-1.5">
          <span
            className="rounded-full"
            style={{
              width: 40,
              height: 4,
              background: "rgba(15,23,42,0.10)",
            }}
          />
        </div>

        {/* Header label */}
        <div
          className="flex items-center gap-2 px-4 pb-2.5"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[13px]"
            style={{
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
            }}
          >
            {agentEmoji || "✨"}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "#9CA3AF" }}
          >
            Talk to module
          </span>
          <span
            className="text-[12px] font-medium ml-0.5"
            style={{ color: "#0A0A0A" }}
          >
            {agentName}
          </span>
        </div>

        {/* Bubbles */}
        {showBubbles && (
          <div
            className="px-4 py-3 space-y-2 overflow-y-auto"
            style={{ maxHeight: 220 }}
          >
            <AnimatePresence initial={false}>
              {chat.slice(-6).map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  agentEmoji={agentEmoji}
                />
              ))}
              {sending && lastIsUser && (
                <TypingBubble key="__typing" agentEmoji={agentEmoji} />
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}

        {/* Quick reply chips */}
        {!sending && quickReplies.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5 px-4 pt-2.5 pb-1"
            style={
              showBubbles
                ? { borderTop: "1px solid rgba(15,23,42,0.04)" }
                : undefined
            }
          >
            {quickReplies.map((q) => (
              <motion.button
                key={q}
                type="button"
                onClick={() => onChangeInput(q)}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#374151",
                  boxShadow: "0 1px 1px rgba(15,23,42,0.03)",
                }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="px-3 pt-2 pb-3">
          <div
            className="flex items-center gap-2 rounded-[14px] px-3 py-2"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.10)",
              boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onChangeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={`Talk to ${agentName}…`}
              disabled={sending}
              className="flex-1 px-1 text-[14px] outline-none bg-transparent text-[#0A0A0A] placeholder:text-[#9CA3AF]"
            />
            <motion.button
              type="button"
              onClick={onSend}
              disabled={sending || !inputValue.trim()}
              whileTap={inputValue.trim() ? { scale: 0.92 } : undefined}
              transition={SPRING}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center disabled:opacity-30"
              style={{
                background: inputValue.trim() ? "#0A0A0A" : "#F2F3F5",
                color: inputValue.trim() ? "#FFFFFF" : "#9CA3AF",
                boxShadow: inputValue.trim()
                  ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)"
                  : undefined,
              }}
            >
              {sending ? (
                <motion.span
                  className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <Send className="w-4 h-4" strokeWidth={1.8} />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Bubbles ──────────────────────────────────────────────────────── */

function ChatBubble({
  message,
  agentEmoji,
}: {
  message: ChatMessage;
  agentEmoji: string;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] shrink-0 mb-0.5"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
          }}
        >
          {agentEmoji || "✨"}
        </div>
      )}
      <div
        className="max-w-[85%] rounded-[16px] px-3.5 py-2 text-[13px] leading-[1.5]"
        style={{
          background: isUser ? "#0A0A0A" : "#FFFFFF",
          color: isUser ? "#FFFFFF" : "#0A0A0A",
          border: isUser ? "none" : "1px solid rgba(15,23,42,0.06)",
          boxShadow: isUser
            ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)"
            : "0 1px 2px rgba(15,23,42,0.04)",
          whiteSpace: "pre-wrap",
          borderBottomLeftRadius: isUser ? 16 : 6,
          borderBottomRightRadius: isUser ? 6 : 16,
        }}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingBubble({ agentEmoji }: { agentEmoji: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-end gap-2 justify-start"
    >
      <motion.div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] shrink-0 mb-0.5"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {agentEmoji || "✨"}
      </motion.div>
      <div
        className="rounded-[16px] px-3.5 py-2 flex items-center gap-1"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          borderBottomLeftRadius: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#9CA3AF" }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
