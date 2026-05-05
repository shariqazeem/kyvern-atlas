"use client";

/**
 * DeviceTabs — three tabs inside the device chassis.
 *
 *   Live Inside    — the demos running, chain enforcing (default)
 *   Deploy Worker  — drop your own agent into the device
 *   Pay & Enforce  — use the device right now, real x402 spends
 *
 * Sticky inside the chassis. Persistent across renders. Animated
 * underline on the active tab.
 */

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type DeviceTab = "live" | "deploy" | "use";

interface Props {
  active: DeviceTab;
  onChange: (tab: DeviceTab) => void;
}

const TABS: Array<{ id: DeviceTab; label: string; sub: string }> = [
  { id: "live", label: "Live Inside", sub: "Demos running" },
  { id: "deploy", label: "Deploy Worker", sub: "Drop your agent" },
  { id: "use", label: "Pay & Enforce", sub: "Use it now" },
];

export function DeviceTabs({ active, onChange }: Props) {
  return (
    <div
      className="rounded-[12px] p-1 grid grid-cols-3 gap-1"
      style={{
        background: "rgba(15,23,42,0.04)",
        border: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="relative rounded-[9px] py-2 px-2 transition active:scale-[0.98]"
            style={{
              background: isActive ? "#FFFFFF" : "transparent",
              boxShadow: isActive
                ? "0 1px 2px rgba(15,23,42,0.06), 0 4px 10px -4px rgba(15,23,42,0.08)"
                : "none",
            }}
          >
            <div
              className="text-[12px] font-semibold tracking-[-0.005em] truncate"
              style={{
                color: isActive ? "#0A0A0A" : "rgba(15,23,42,0.55)",
              }}
            >
              {t.label}
            </div>
            <div
              className="font-mono uppercase tracking-[0.12em] truncate"
              style={{
                fontSize: 8.5,
                color: isActive ? "rgba(15,23,42,0.55)" : "rgba(15,23,42,0.40)",
              }}
            >
              {t.sub}
            </div>
            {isActive && (
              <motion.div
                layoutId="device-tab-pill"
                aria-hidden
                className="absolute inset-0 rounded-[9px] pointer-events-none"
                style={{
                  border: "1px solid rgba(34,197,94,0.20)",
                  boxShadow: "inset 0 0 0 1px rgba(34,197,94,0.06)",
                }}
                transition={{ duration: 0.35, ease: EASE }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
