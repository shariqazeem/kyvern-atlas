"use client";

/**
 * GenesisStrip — Phase 5.
 *
 *   GENESIS DEVICE · v0.1 · ROADMAP →
 *
 * Subtle, single-line. Sits at the very bottom of the /app device home
 * to tell the judge "this is the start, not the end." Click → /roadmap.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function GenesisStrip() {
  return (
    <div className="flex items-center justify-center pt-1">
      <Link
        href="/roadmap"
        className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] hover:opacity-70 transition py-2"
        style={{
          fontSize: 9.5,
          color: "rgba(15,23,42,0.40)",
          letterSpacing: "0.20em",
        }}
      >
        <span>Genesis device</span>
        <Dot />
        <span>v0.1</span>
        <Dot />
        <span className="inline-flex items-center gap-0.5">
          Roadmap
          <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2.2} />
        </span>
      </Link>
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      style={{ color: "rgba(15,23,42,0.18)" }}
    >
      ·
    </span>
  );
}
