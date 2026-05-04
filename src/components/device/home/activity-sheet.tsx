"use client";

/**
 * ActivitySheet — pull-up bottom sheet that houses the demoted
 * dashboard from the pre-Live-Engine era.
 *
 * The Live Engine home shows three nouns: device · workers · dollar.
 * Power users still want to read the deeper feed (every action, every
 * policy decision, every revenue tick). This sheet is where that lives
 * — one tap from the home page, one tap to dismiss.
 *
 * The sheet does NOT fetch new data. It accepts the parent's already-
 * polled live status payload and renders the existing components
 * exactly as they were on the old /app, just relocated.
 */

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ActivitySheet({ open, onClose, children }: Props) {
  // Lock body scroll while the sheet is open so the underlying /app
  // doesn't drift on touch. Standard mobile-sheet hygiene.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC closes — keyboard users + judges with hardware keyboards.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="activity-backdrop"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              background: "rgba(15,23,42,0.32)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="activity-sheet"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] overflow-hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{
              background: "#FAFAFA",
              border: "1px solid rgba(15,23,42,0.08)",
              borderBottom: "none",
              boxShadow: "0 -16px 40px rgba(15,23,42,0.18)",
              maxHeight: "88dvh",
            }}
          >
            {/* Drag handle + header */}
            <div
              className="flex flex-col items-center px-5 pt-3 pb-3 sticky top-0"
              style={{
                background: "#FAFAFA",
                borderBottom: "1px solid rgba(15,23,42,0.06)",
                zIndex: 1,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close activity sheet"
                className="rounded-full mb-2"
                style={{
                  width: 40,
                  height: 4,
                  background: "rgba(15,23,42,0.18)",
                }}
              />
              <div className="flex items-center justify-between w-full">
                <span
                  className="font-mono uppercase tracking-[0.18em]"
                  style={{
                    fontSize: 10.5,
                    color: "rgba(15,23,42,0.65)",
                  }}
                >
                  Full activity
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition"
                  style={{
                    fontSize: 10,
                    color: "rgba(15,23,42,0.50)",
                  }}
                >
                  Close
                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scrollable body — the dashboard, only here, by request */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 pb-10 pt-4 flex flex-col gap-4">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
