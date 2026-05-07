"use client";

/**
 * GenesisStrip — Phase 5 (Device Shell Redesign refactor).
 *
 *   GENESIS DEVICE · v0.1
 *   ROADMAP →
 *
 * Two-line variant for in-control-zone rendering. Tighter padding so it
 * docks cleanly below the affordances block. Same data + roadmap link.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  className?: string;
}

export function GenesisStrip({ className }: Props) {
  return (
    <Link
      href="/roadmap"
      className={`flex flex-col items-center text-center hover:opacity-70 transition ${className ?? ""}`}
    >
      <span
        className="font-mono uppercase tracking-[0.20em]"
        style={{
          fontSize: 9.5,
          color: "rgba(15,23,42,0.40)",
        }}
      >
        Genesis device · v0.1
      </span>
      <span
        className="font-mono uppercase tracking-[0.18em] inline-flex items-center gap-0.5 mt-0.5"
        style={{
          fontSize: 9.5,
          color: "rgba(15,23,42,0.55)",
        }}
      >
        Roadmap
        <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2.2} />
      </span>
    </Link>
  );
}

