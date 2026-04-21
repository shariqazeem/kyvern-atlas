"use client";

/**
 * PageTransition — buttery route fades for /app/* children.
 *
 * Uses `usePathname` + framer-motion's AnimatePresence with `mode="wait"`
 * so the old page finishes its exit before the new one begins. Simple,
 * content-agnostic, 180ms fade-through with a slight upward translate.
 * Tuned to feel like Apple's product pages — not too slow, not jumpy.
 */

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname ?? "root"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.26, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
