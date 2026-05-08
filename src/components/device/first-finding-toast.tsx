"use client";

/**
 * FirstFindingToast — Phase 6 (Frontier Grand Champion).
 *
 * Fires once per device when the first user-facing Phase 3 SignalKind
 * lands. Auto-dismisses after 8s or on tap. Tracks dismissal in
 * localStorage keyed by deviceId so it never repeats.
 *
 * Listens to the live action feed prop — not its own subscription —
 * so it re-renders cheaply alongside /app's existing 5s polling.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { WorkerEmoji } from "@/components/icons/worker-emoji";
import { CheckCircle2, X } from "lucide-react";

interface SignalLike {
  id: string;
  kind: string;
  worker?: { name?: string; emoji?: string };
}

interface Props {
  deviceId: string | null;
  /** Recent action feed (the same array the canvas + ticker use). The
   *  toast scans for the first user-facing Phase 3 SignalKind. */
  signals: SignalLike[];
}

const STORAGE_KEY = (deviceId: string) =>
  `kyvern:first-finding-toast:${deviceId}`;

const PHASE_3_KINDS = new Set([
  "drafted_application",
  "wallet_alert",
  "trigger_fired",
]);

function copyFor(kind: string, workerName: string | undefined): string {
  const w = workerName ?? "A worker";
  if (kind === "drafted_application")
    return `${w} just drafted your first application.`;
  if (kind === "wallet_alert")
    return `${w} spotted activity on a watched wallet.`;
  if (kind === "trigger_fired")
    return `${w} fired your first trigger — you have new SOL.`;
  return `${w} surfaced your first finding.`;
}

export function FirstFindingToast({ deviceId, signals }: Props) {
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState<SignalLike | null>(null);

  // Find the first qualifying signal — only when we haven't shown the
  // toast yet for this device.
  useEffect(() => {
    if (!deviceId) return;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY(deviceId));
    if (seen) return;
    const m = signals.find((s) => PHASE_3_KINDS.has(s.kind));
    if (m) {
      setMatch(m);
      setOpen(true);
      window.localStorage.setItem(STORAGE_KEY(deviceId), m.id);
    }
  }, [deviceId, signals]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 8_000);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && match && (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2.5 max-w-[92vw]"
          style={{
            background: "#0A0A0A",
            color: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.85)",
            boxShadow:
              "0 12px 32px rgba(15,23,42,0.22), 0 0 0 4px rgba(34,197,94,0.10)",
          }}
        >
          <CheckCircle2
            className="w-4 h-4 flex-shrink-0"
            strokeWidth={2}
            style={{ color: "#86EFAC" }}
          />
          <span className="text-[12.5px] font-medium tracking-[-0.005em] inline-flex items-center gap-1">
            {match.worker?.emoji && (
              <WorkerEmoji emoji={match.worker.emoji} size={12} strokeWidth={2} />
            )}
            <span>{copyFor(match.kind, match.worker?.name)}</span>
          </span>
          <Link
            href="/app/inbox"
            onClick={() => setOpen(false)}
            className="ml-1 inline-flex items-center font-mono uppercase tracking-[0.16em] flex-shrink-0"
            style={{ fontSize: 9.5, color: "#86EFAC" }}
          >
            Open Findings →
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 rounded-full p-1 hover:bg-white/10 transition flex-shrink-0"
            aria-label="Dismiss"
          >
            <X
              className="w-3 h-3"
              strokeWidth={2}
              style={{ color: "rgba(255,255,255,0.55)" }}
            />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
