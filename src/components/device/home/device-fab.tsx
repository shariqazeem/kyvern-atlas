"use client";

/**
 * DeviceFAB — physical-looking circular action button that floats above
 * the bottom TabBar. Tap to expand into two action pills: Top up device
 * and Hire worker. Spring physics on expand, haptic-style scale on press.
 *
 * Light premium register: white-on-white with crisp inner highlight, soft
 * shadow stack, rotates the + into × when open. The action pills slide up
 * from the FAB with a small stagger.
 *
 * Positioning: fixed, right-aligned to the 680px content container, lifted
 * above the TabBar with safe-area insets respected for iPhone notch.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, UserPlus } from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.6 };
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface DeviceFABProps {
  onTopUp: () => void;
  hireHref: string;
}

export function DeviceFAB({ onTopUp, hireHref }: DeviceFABProps) {
  const [open, setOpen] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Tap-out scrim — catches outside taps to close, transparent */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            style={{ background: "rgba(15,23,42,0.04)" }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div
        className="fixed z-50 flex flex-col items-end gap-2"
        style={{
          right: "max(20px, calc(50% - 320px))",
          bottom: "calc(72px + env(safe-area-inset-bottom) + 14px)",
        }}
      >
        {/* Action pills (stack upward) */}
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                key="topup"
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                transition={{ ...SPRING, delay: 0.04 }}
                onClick={() => {
                  setOpen(false);
                  onTopUp();
                }}
                className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.16)",
                }}
              >
                <Wallet className="w-4 h-4 text-[#0A0A0A]" strokeWidth={1.7} />
                <span className="text-[13px] font-medium text-[#0A0A0A]">
                  Top up device
                </span>
              </motion.button>

              <motion.div
                key="hire"
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                transition={SPRING}
              >
                <Link
                  href={hireHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full"
                  style={{
                    background: "#0A0A0A",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10), 0 8px 24px -8px rgba(15,23,42,0.36)",
                  }}
                >
                  <UserPlus className="w-4 h-4 text-white" strokeWidth={1.7} />
                  <span className="text-[13px] font-medium text-white">
                    Hire worker
                  </span>
                </Link>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* The FAB itself */}
        <motion.button
          type="button"
          aria-label={open ? "Close actions" : "Open actions"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          className="relative flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "inset 0 -1px 0 rgba(15,23,42,0.04)",
              "0 1px 2px rgba(15,23,42,0.06)",
              "0 8px 18px -6px rgba(15,23,42,0.16)",
              "0 18px 36px -12px rgba(15,23,42,0.18)",
            ].join(", "),
          }}
        >
          {/* Subtle breathing pulse ring (only when closed) */}
          {!open && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "1px solid rgba(34,197,94,0.0)" }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(34,197,94,0.0)",
                  "0 0 0 6px rgba(34,197,94,0.0)",
                  "0 0 0 0 rgba(34,197,94,0.0)",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity }}
            />
          )}
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-[#0A0A0A]" strokeWidth={1.8} />
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}
