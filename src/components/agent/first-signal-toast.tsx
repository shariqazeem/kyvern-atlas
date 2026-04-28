"use client";

/**
 * FirstSignalToast — fires once, when totalThoughts goes 0→1.
 *
 * Bottom-right on desktop, top-banner on mobile. Auto-dismisses after
 * 6s. Clickable, links to /app/inbox. The owner can stay on the
 * agent page if they want to keep watching the worker — the toast is
 * the only nudge.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface FirstSignalToastProps {
  show: boolean;
  agentName: string;
  /** Called when the toast finishes auto-dismissing or the user closes it. */
  onDismiss: () => void;
}

export function FirstSignalToast({
  show,
  agentName,
  onDismiss,
}: FirstSignalToastProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="first-signal-toast"
          initial={
            isMobile
              ? { opacity: 0, y: -20 }
              : { opacity: 0, y: 24, scale: 0.96 }
          }
          animate={
            isMobile
              ? { opacity: 1, y: 0 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          exit={
            isMobile
              ? { opacity: 0, y: -20 }
              : { opacity: 0, y: 16, scale: 0.96 }
          }
          transition={{ duration: 0.45, ease: EASE }}
          className={
            isMobile
              ? "fixed top-4 left-4 right-4 z-50"
              : "fixed bottom-6 right-6 z-50"
          }
          style={{ maxWidth: isMobile ? undefined : 360 }}
        >
          <Link
            href="/app/inbox"
            onClick={onDismiss}
            className="block rounded-[16px] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #F4F8F4 100%)",
              border: "1px solid rgba(34,197,94,0.30)",
              boxShadow: [
                "inset 0 1px 0 rgba(255,255,255,1)",
                "0 4px 12px rgba(15,23,42,0.08)",
                "0 16px 40px -8px rgba(15,23,42,0.18)",
                "0 0 0 4px rgba(34,197,94,0.08)",
              ].join(", "),
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <motion.div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.04) 70%)",
                  border: "1px solid rgba(34,197,94,0.45)",
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#15803D" }} strokeWidth={1.8} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono uppercase tracking-[0.14em] mb-0.5"
                  style={{ color: "#15803D", fontSize: 9.5 }}
                >
                  New finding
                </div>
                <div
                  className="text-[13px] font-medium tracking-tight truncate"
                  style={{ color: "#0A0A0A" }}
                >
                  Your first finding from {agentName}
                </div>
              </div>
              <ArrowUpRight
                className="w-4 h-4 shrink-0"
                style={{ color: "#374151" }}
                strokeWidth={1.8}
              />
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
