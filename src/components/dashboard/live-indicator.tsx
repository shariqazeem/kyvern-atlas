"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLiveEvents } from "@/hooks/use-live-events";

export function LiveIndicator() {
  const { isConnected, newEventCount, clearNewCount } = useLiveEvents();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-600 font-medium">
              Live
            </span>
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <span className="text-[11px] text-quaternary">Connecting...</span>
          </>
        )}
      </div>
      <AnimatePresence>
        {newEventCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={clearNewCount}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pulse/10 text-pulse text-[10px] font-medium hover:bg-pulse/20 transition-colors"
          >
            {newEventCount} new
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
