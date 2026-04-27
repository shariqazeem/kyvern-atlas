"use client";

/**
 * CartridgePicker — Screen 1 of the spawn flow.
 *
 * "Choose a module to install." Each available worker template is
 * rendered as a physical-feeling cartridge tile: emoji on a recessed
 * label well, mono module-ID engraving, name + description, a small
 * stats footer (Watches / Pings), and a faux connector strip at the
 * bottom that visually suggests "this thing plugs into the device".
 *
 * Premium light register — paper-grain noise, layered shadow, crisp
 * inner highlight. Spring-physics tap to feel haptic.
 */

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { AgentTemplate, AgentTemplateDef } from "@/lib/agents/types";

interface CartridgePickerProps {
  templates: AgentTemplateDef[];
  serial: string;
  onPick: (id: AgentTemplate) => void;
}

function moduleId(t: AgentTemplateDef): string {
  // KVN-MOD-SCOUT, KVN-MOD-EARNER … purely cosmetic engraving
  return `KVN-MOD-${t.id.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 14)}`;
}

export function CartridgePicker({ templates, serial, onPick }: CartridgePickerProps) {
  return (
    <div>
      <div className="mb-6">
        <div
          className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2"
          style={{ color: "#9CA3AF" }}
        >
          Module library
        </div>
        <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#0A0A0A]">
          Choose a module to install
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1.5">
          For{" "}
          <span className="font-mono text-[#0A0A0A]">{serial}</span>. Each
          cartridge is a self-contained worker — pick the shape, calibrate it
          on the next screen.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((t, i) => (
          <Cartridge
            key={t.id}
            template={t}
            index={i}
            onPick={() => onPick(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Cartridge({
  template: t,
  index,
  onPick,
}: {
  template: AgentTemplateDef;
  index: number;
  onPick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="relative text-left rounded-[18px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 8px 24px -10px rgba(15,23,42,0.08)",
          "0 18px 40px -16px rgba(15,23,42,0.10)",
        ].join(", "),
      }}
    >
      {/* Fine paper-grain noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.55'/></svg>\")",
          opacity: 0.018,
          mixBlendMode: "multiply",
        }}
      />

      {/* Top edge highlight */}
      <div
        aria-hidden
        className="absolute top-0 left-6 right-6 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
        }}
      />

      <div className="relative px-5 pt-5 pb-4">
        {/* Top row — recessed emoji well + chevron */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px]"
            style={{
              background: "linear-gradient(180deg, #F2F3F5 0%, #FFFFFF 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow:
                "inset 0 1px 2px rgba(15,23,42,0.06), inset 0 -1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {t.emoji}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full"
              style={{
                color: "#6B7280",
                background: "rgba(15,23,42,0.04)",
                letterSpacing: "0.14em",
              }}
            >
              {moduleId(t)}
            </span>
            <ChevronRight className="w-4 h-4 text-[#D1D5DB] mt-1.5" strokeWidth={1.7} />
          </div>
        </div>

        <h3 className="text-[17px] font-semibold text-[#0A0A0A] mb-1 tracking-tight">
          {t.name}
        </h3>
        <p className="text-[12.5px] text-[#6B6B6B] leading-[1.5] mb-4 min-h-[36px]">
          {t.description}
        </p>

        {/* Stats footer */}
        <div
          className="grid grid-cols-2 gap-0 rounded-[10px] overflow-hidden"
          style={{
            background: "rgba(15,23,42,0.025)",
            border: "1px solid rgba(15,23,42,0.05)",
          }}
        >
          <Stat label="Watches" value={t.watches} />
          <Stat label="Pings" value={t.pings} divider />
        </div>
      </div>

      {/* Bottom connector strip — fakes the physical "plug" of a cartridge */}
      <div
        aria-hidden
        className="relative h-[14px] flex items-center justify-center gap-1.5"
        style={{
          background: "linear-gradient(180deg, #F8F8FA 0%, #ECEDF0 100%)",
          borderTop: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="rounded-sm"
            style={{
              width: 8,
              height: 3,
              background: "rgba(15,23,42,0.18)",
              boxShadow: "inset 0 -0.5px 0 rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </motion.button>
  );
}

function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-3 py-2"
      style={
        divider
          ? { borderLeft: "1px solid rgba(15,23,42,0.05)" }
          : undefined
      }
    >
      <div
        className="font-mono text-[9px] uppercase tracking-[0.14em] mb-0.5"
        style={{ color: "#9CA3AF" }}
      >
        {label}
      </div>
      <div className="text-[11.5px] text-[#374151] leading-[1.35]">{value}</div>
    </div>
  );
}
