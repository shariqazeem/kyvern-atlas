"use client";

/**
 * GraphAddTile — the "+ Deploy agent" CTA tile.
 *
 * In the empty state (zero agents), this is emphasized: larger,
 * pulsing, with the device's primary green. With other agents on
 * the canvas, it's a small chip that fits at the right end of the
 * arc and reads as just a quiet affordance.
 */

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
  emphasized?: boolean;
}

export function GraphAddTile({ onClick, emphasized = false }: Props) {
  if (emphasized) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{ boxShadow: ["0 0 0 0 rgba(34,197,94,0.45)", "0 0 0 12px rgba(34,197,94,0)"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        className="rounded-[14px] flex flex-col items-center gap-1.5 px-5 py-4 transition"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #ECFDF5 100%)",
          border: "1px solid rgba(34,197,94,0.40)",
        }}
      >
        <Plus className="w-5 h-5" strokeWidth={2.2} style={{ color: "#15803D" }} />
        <span
          className="text-[13px] font-semibold tracking-[-0.005em]"
          style={{ color: "#0A0A0A" }}
        >
          Deploy your first agent
        </span>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9, color: "#15803D" }}
        >
          recipe · or · compose
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className="rounded-[12px] flex flex-col items-center gap-1 px-3 py-2 transition"
      style={{
        background: "rgba(34,197,94,0.06)",
        border: "1px dashed rgba(34,197,94,0.45)",
        minWidth: 100,
      }}
    >
      <Plus className="w-3.5 h-3.5" strokeWidth={2.2} style={{ color: "#15803D" }} />
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 9, color: "#15803D" }}
      >
        Deploy
      </span>
    </motion.button>
  );
}
