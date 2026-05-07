"use client";

/**
 * AffordanceRow — three contextual buttons that open card-based slide-in
 * panels OVER the device. Replaces the old DeviceTabs surface.
 *
 * The user is always at home. Each affordance opens an instrument drawer.
 *
 *   [ + Open a bay ]  [ ↗ Use the device ]  [ </> Builder ]
 *
 * `active` highlights the button whose panel is currently open. Tapping
 * the same button while open is a no-op (parent decides whether to
 * toggle-close — keeps this purely declarative).
 */

import { motion } from "framer-motion";
import { Plus, ArrowUpRight, Code2 } from "lucide-react";

export type PanelKind = "bay" | "use" | "builder";

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
  { kind: "bay", label: "Open a bay", sub: "deploy a worker", Icon: Plus },
  { kind: "use", label: "Use the device", sub: "buy · drain", Icon: ArrowUpRight },
  { kind: "builder", label: "Builder", sub: "playground · sdk · key", Icon: Code2 },
];

export function AffordanceRow({ active, onOpen }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {ITEMS.map((it) => {
        const isActive = active === it.kind;
        return (
          <motion.button
            key={it.kind}
            type="button"
            onClick={() => onOpen(it.kind)}
            whileTap={{ scale: 0.98 }}
            aria-pressed={isActive}
            className="rounded-[12px] flex flex-col items-center justify-center gap-0.5 py-3 px-2 transition"
            style={{
              background: isActive ? "#0A0A0A" : "#FFFFFF",
              color: isActive ? "#FFFFFF" : "#0A0A0A",
              border: isActive
                ? "1px solid rgba(0,0,0,0.85)"
                : "1px solid rgba(15,23,42,0.10)",
              boxShadow: isActive
                ? "0 1px 2px rgba(0,0,0,0.10), 0 4px 14px rgba(0,0,0,0.18)"
                : "0 1px 2px rgba(15,23,42,0.04)",
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
              style={{
                fontSize: 8.5,
                color: isActive
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(15,23,42,0.50)",
              }}
            >
              {it.sub}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
