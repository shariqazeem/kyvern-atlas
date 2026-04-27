"use client";

/**
 * InboxPreview — three mini "notification-on-the-device" cards near the
 * bottom of the chassis. Polls `/api/devices/[id]/inbox` every 5s. Each
 * card shows the worker emoji, the signal subject (one line, truncated),
 * an unread dot, and how long ago it landed. Tap any card to deep-link
 * into the full inbox.
 *
 * Premium light register — white card stack, hairline borders, soft
 * shadow; the unread dot is the only saturated colour.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Signal } from "@/lib/agents/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function InboxPreview({ deviceId }: { deviceId: string }) {
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/inbox?limit=3`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          setSignals((d.signals ?? []) as SignalWithWorker[]);
          setUnread(d.unreadCount ?? 0);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF]">
          Inbox
          {unread > 0 && (
            <span className="ml-2 normal-case tracking-normal text-[#15803D]">
              {unread} unread
            </span>
          )}
        </div>
        <Link
          href="/app/inbox"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B7280] hover:text-[#0A0A0A] transition flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {!loaded && (
          <div className="font-mono text-[12px] text-[#9CA3AF] py-3 text-center">
            …
          </div>
        )}
        {loaded && signals.length === 0 && (
          <div
            className="rounded-[14px] px-4 py-3 text-[12px] text-[#6B7280]"
            style={{
              background: "rgba(15,23,42,0.02)",
              border: "1px dashed rgba(15,23,42,0.10)",
            }}
          >
            No signals yet — workers will deliver findings here.
          </div>
        )}
        <AnimatePresence initial={false}>
          {signals.slice(0, 3).map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <Link
                href="/app/inbox"
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition active:scale-[0.99]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow:
                    "0 1px 2px rgba(15,23,42,0.03), 0 6px 12px -6px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] flex-none"
                  style={{
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F4F5F7 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  {s.worker.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] text-[#0A0A0A] truncate"
                    style={{ fontWeight: 500 }}
                  >
                    {s.subject}
                  </div>
                  <div className="font-mono text-[10px] text-[#9CA3AF] mt-0.5">
                    {s.worker.name} · {fmtAgo(s.createdAt)} ago
                  </div>
                </div>
                {s.status === "unread" && (
                  <span
                    className="rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      background: "#22C55E",
                      boxShadow: "0 0 0 3px rgba(34,197,94,0.12)",
                    }}
                    aria-label="unread"
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
