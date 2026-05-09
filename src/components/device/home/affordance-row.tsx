"use client";

/**
 * AffordanceRow — four contextual buttons that open card-based slide-in
 * panels OVER the device. Per SPEC_TO_WIN R4, the device is a developer
 * playground; each affordance is one thing a builder does on it.
 *
 *   [ Watch the chain ]  [ Wrap pay.sh ]  [ Send to KAST ]  [ Wrap your agent ]
 *
 * `active` highlights the button whose panel is currently open.
 */

import { motion } from "framer-motion";
import { Code2, CreditCard, ShieldX, Sparkles } from "lucide-react";

export type PanelKind = "bay" | "use" | "kast" | "builder";

interface Props {
  active: PanelKind | null;
  onOpen: (kind: PanelKind) => void;
}

const ITEMS: Array<{
  kind: PanelKind;
  label: string;
  sub: string;
  Icon: typeof Code2;
}> = [
  { kind: "bay", label: "Watch the chain", sub: "5 violations · real failed tx", Icon: ShieldX },
  { kind: "use", label: "Wrap pay.sh", sub: "Solana × x402 · shell-out", Icon: Sparkles },
  { kind: "kast", label: "Send to KAST", sub: "earnings → real card", Icon: CreditCard },
  { kind: "builder", label: "Wrap your agent", sub: "sdk · scaffolder · key", Icon: Code2 },
];

export function AffordanceRow({ active, onOpen }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
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
