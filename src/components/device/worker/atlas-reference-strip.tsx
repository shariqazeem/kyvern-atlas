"use client";

/**
 * AtlasReferenceStrip — single-line callout under the user's Worker
 * Card on /app. Atlas was the protagonist; now it's the reference.
 *
 * Polls /api/atlas/status (3s) for live counters. Click → /atlas.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface AtlasMini {
  totalCycles: number;
  totalAttacksBlocked: number;
  totalSettled: number;
  fundsLostUsd: number;
  uptimeMs: number;
  running: boolean;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function AtlasReferenceStrip() {
  const [s, setS] = useState<AtlasMini | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/status", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as AtlasMini;
        if (alive) setS(d);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const days =
    s && s.uptimeMs > 0
      ? Math.floor(s.uptimeMs / (24 * 60 * 60 * 1000))
      : null;

  return (
    <Link href="/atlas" className="block group">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
        className="rounded-[14px] px-4 py-3 flex items-center gap-3 transition-all group-hover:translate-x-0.5"
        style={{
          background:
            "linear-gradient(180deg, #0A0E1A 0%, #0F1426 100%)",
          border: "1px solid rgba(34,197,94,0.18)",
          boxShadow: "0 0 24px -8px rgba(34,197,94,0.15)",
        }}
      >
        {/* Avatar */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 32, height: 32 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-[10px]"
            animate={{
              boxShadow: [
                "0 0 0 1.5px rgba(134,239,172,0.30)",
                "0 0 0 1.5px rgba(134,239,172,0.55), 0 0 8px rgba(134,239,172,0.30)",
                "0 0 0 1.5px rgba(134,239,172,0.30)",
              ],
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="absolute inset-0 rounded-[10px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)",
            }}
          >
            <span
              className="font-serif"
              style={{
                fontSize: 16,
                color: "#F9FAFB",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              A
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9, color: "rgba(134,239,172,0.75)" }}
            >
              Reference worker · live
            </span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              Atlas
            </span>
          </div>
          {s ? (
            <p
              className="font-mono leading-[1.45]"
              style={{
                fontSize: 11.5,
                color: "rgba(229,231,235,0.65)",
              }}
            >
              {days !== null ? `${days} days autonomous · ` : ""}
              <span style={{ color: "#E5E7EB", fontWeight: 600 }}>
                {s.totalCycles.toLocaleString()}
              </span>{" "}
              cycles ·{" "}
              <span style={{ color: "#E5E7EB", fontWeight: 600 }}>
                {s.totalAttacksBlocked.toLocaleString()}
              </span>{" "}
              attacks refused on-chain ·{" "}
              <span style={{ color: "#86EFAC", fontWeight: 600 }}>
                ${s.fundsLostUsd.toFixed(2)} lost
              </span>
            </p>
          ) : (
            <p
              className="font-mono"
              style={{
                fontSize: 11.5,
                color: "rgba(229,231,235,0.45)",
              }}
            >
              Loading public counters…
            </p>
          )}
        </div>

        {/* Arrow */}
        <ArrowUpRight
          className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={2}
          style={{ color: "rgba(134,239,172,0.65)" }}
        />
      </motion.div>
    </Link>
  );
}
