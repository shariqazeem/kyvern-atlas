"use client";

/**
 * AffordancesBlock — Phase 4 (Device Shell Redesign).
 *
 * Three pill buttons inside the control zone — same handlers as the
 * legacy AffordanceRow, compacted: `+ Bay` and `↗ Use` side-by-side
 * on the top row, `</> Builder` full-width below.
 *
 * Drawer panels (OpenBayPanel · UseDevicePanel · BuilderPanel) are
 * unchanged and continue to render at the page level.
 */

import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Code2 } from "lucide-react";
import type { PanelKind } from "../../home/affordance-row";

interface Props {
  active: PanelKind | null;
  onOpen: (kind: PanelKind) => void;
  className?: string;
}

export function AffordancesBlock({ active, onOpen, className }: Props) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ""}`}>
      <Pill
        icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
        label="Bay"
        active={active === "bay"}
        onClick={() => onOpen("bay")}
      />
      <Pill
        icon={<ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />}
        label="Use"
        active={active === "use"}
        onClick={() => onOpen("use")}
      />
      <Pill
        icon={<Code2 className="w-3.5 h-3.5" strokeWidth={2} />}
        label="Builder"
        active={active === "builder"}
        onClick={() => onOpen("builder")}
        fullWidth
      />
    </div>
  );
}

function Pill({
  icon,
  label,
  active,
  onClick,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-xl text-[13px] font-medium transition-[background,border,transform] duration-150 ${
        fullWidth ? "col-span-2" : ""
      }`}
      style={{
        background: active ? "#0A0A0A" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0A0A0A",
        border: active
          ? "1px solid rgba(0,0,0,0.85)"
          : "1px solid rgba(15,23,42,0.10)",
        boxShadow: active
          ? "0 1px 2px rgba(0,0,0,0.10), 0 4px 14px rgba(0,0,0,0.18)"
          : "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}
