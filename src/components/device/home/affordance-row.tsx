"use client";

/**
 * AffordanceRow — three chassis labels under the device.
 *
 * Originally these were modal-opening tabs (Open a bay → Use the
 * device → Builder), each firing an instrument-drawer panel. After
 * the alive-console rebuild, the wizard owns every interaction —
 * the panels became a redundant second surface. So the row is now
 * **chassis decoration**: it tells the visitor what this device
 * does, without forcing them to navigate.
 *
 * Click does the smallest useful thing — a soft scroll up to the
 * wizard so the user knows *that's* where the actions live.
 */

import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Code2 } from "lucide-react";

// Kept for backward compat with /app/page.tsx — the panel state
// machine is being phased out but the type still references this.
export type PanelKind = "bay" | "use" | "kast" | "builder";

interface Props {
  active: PanelKind | null;
  onOpen: (kind: PanelKind) => void;
}

const ITEMS: Array<{
  kind: PanelKind;
  label: string;
  sub: string;
  Icon: typeof Plus;
}> = [
  { kind: "bay", label: "Open a bay", sub: "deploy your agent", Icon: Plus },
  { kind: "use", label: "Use the device", sub: "watch the chain decide", Icon: ArrowUpRight },
  { kind: "builder", label: "Builder", sub: "sdk · scaffolder · key", Icon: Code2 },
];

export function AffordanceRow({ active, onOpen }: Props) {
  // Chassis-decoration mode — clicking soft-scrolls back to the
  // wizard rather than opening a panel. (Active state preserved
  // for callers; nothing currently sets it.)
  void active;

  function handleClick(kind: PanelKind) {
    // No panel anymore — bridge the click to the wizard. Soft
    // scroll the page up so the user lands on the integration flow.
    void onOpen(kind); // keep parent informed (state machine compat)
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {ITEMS.map((it) => (
        <motion.button
          key={it.kind}
          type="button"
          onClick={() => handleClick(it.kind)}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -1 }}
          className="rounded-[12px] flex flex-col items-center justify-center gap-0.5 py-3 px-2 transition"
          style={{
            background: "#FFFFFF",
            color: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <it.Icon className="w-3.5 h-3.5" strokeWidth={2} />
          <span
            className="text-[12px] font-semibold tracking-[-0.005em]"
            style={{ marginTop: 2 }}
          >
            {it.label}
          </span>
          <span
            className="font-mono uppercase tracking-[0.12em]"
            style={{ fontSize: 8.5, color: "rgba(15,23,42,0.50)" }}
          >
            {it.sub}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
