"use client";

/**
 * Home device hero card — Section 2A.
 *
 * The screenshot weapon. A dark, hardware-feel surface with the
 * KVN-XXXX serial, a giant USDC balance that scrambles on change,
 * three live status pills, an orbital row of worker avatars, and a
 * 24h PnL sparkline. Polls /api/devices/[id]/live-status every 5s.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface LiveStatus {
  serial: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  bornAt: string;
  usdcBalance: number;
  pnlToday: { earned: number; spent: number; net: number };
  pnlSparkline: number[];
  workersActive: number;
  earningPerMinUsd: number;
  lastAction: {
    worker: string;
    emoji: string;
    verb: string;
    agoSeconds: number;
  } | null;
  workers: Array<{
    id: string;
    name: string;
    emoji: string;
    isThinking: boolean;
    totalThoughts: number;
    totalEarnedUsd: number;
  }>;
}

/* ── ScrambleNumber ─────────────────────────────────────────────────
   Scrambles digits when the displayed value changes. Single non-digit
   character ('$', '.') is preserved and never scrambled. */

function ScrambleNumber({
  value,
  prefix = "$",
  decimals = 3,
  className,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(`${prefix}${value.toFixed(decimals)}`);
  const targetRef = useRef(display);

  useEffect(() => {
    const next = `${prefix}${value.toFixed(decimals)}`;
    if (next === targetRef.current) return;
    targetRef.current = next;

    const start = performance.now();
    const duration = 600;
    const charset = "0123456789";

    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        setDisplay(next);
        return;
      }
      // Reveal characters left-to-right; un-revealed ones scramble
      const revealCount = Math.floor(next.length * t);
      let out = "";
      for (let i = 0; i < next.length; i++) {
        const c = next[i];
        if (i < revealCount || !/[0-9]/.test(c)) {
          out += c;
        } else {
          out += charset[Math.floor(Math.random() * charset.length)];
        }
      }
      setDisplay(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, prefix, decimals]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}

/* ── Sparkline ──────────────────────────────────────────────────── */

function Sparkline({
  values,
  color,
  width = 160,
  height = 36,
  gradientId = "spark-grad",
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  gradientId?: string;
}) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────── */

function StatusPill({
  icon,
  children,
  glow,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.85)",
        boxShadow: glow ? "inset 0 0 12px rgba(74,222,128,0.06)" : undefined,
      }}
    >
      {icon}
      <span style={{ fontFeatureSettings: '"tnum"' }}>{children}</span>
    </div>
  );
}

function WorkerAvatar({ emoji, thinking, name }: { emoji: string; thinking: boolean; name: string }) {
  return (
    <div className="relative" title={name}>
      {/* always-on subtle ring — signals "powered" even at rest */}
      <div
        className="absolute inset-[-3px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
      />
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] relative z-10"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: thinking
            ? "0 0 0 1px rgba(74,222,128,0.18), 0 0 14px rgba(74,222,128,0.18)"
            : undefined,
        }}
      >
        {emoji}
      </div>
      {thinking && (
        <motion.div
          className="absolute inset-[-5px] rounded-full pointer-events-none"
          style={{
            border: "1.5px dashed rgba(74,222,128,0.85)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

function formatBornAt(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return "—";
  const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `Born ${month} ${day}, ${year} · ${hh}:${mm} UTC`;
}

function agoLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/* ── Component ──────────────────────────────────────────────────── */

export function DeviceHeroCard({ deviceId }: { deviceId: string }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/live-status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: LiveStatus | null) => {
          if (alive && d) setStatus(d);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  const netPositive = (status?.pnlToday.net ?? 0) >= 0;
  const sparkColor = netPositive ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)";
  const netColor = netPositive ? "#4ADE80" : "#F87171";

  const earningRate = useMemo(() => {
    const r = status?.earningPerMinUsd ?? 0;
    if (r === 0) return "0.000";
    return r.toFixed(3);
  }, [status?.earningPerMinUsd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full overflow-hidden"
      style={{
        borderRadius: 20,
        background:
          "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(0,0,0,0.45)",
      }}
    >
      {/* fine-grain noise overlay (cheap CSS, no asset) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.5'/></svg>\")",
          opacity: 0.025,
          mixBlendMode: "overlay",
        }}
      />

      {/* top-edge highlight */}
      <div
        className="absolute top-0 left-6 right-6 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
        }}
      />

      <div className="relative px-6 pt-5 pb-5 sm:px-7 sm:pt-6 sm:pb-6">
        {/* Top row: ONLINE / KVN-XXXX */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2">
            <motion.span
              className="w-[7px] h-[7px] rounded-full"
              style={{
                background: status?.paused ? "#F87171" : "#4ADE80",
                boxShadow: status?.paused
                  ? "0 0 0 2px rgba(248,113,113,0.18)"
                  : "0 0 0 2px rgba(74,222,128,0.18)",
              }}
              animate={!status?.paused ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span
              className="text-[10px] font-mono uppercase"
              style={{
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.12em",
              }}
            >
              {status?.paused ? "PAUSED" : "ONLINE"}
            </span>
          </div>
          <span
            className="text-[12px] font-mono"
            style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}
          >
            {status?.serial ?? "KVN-——————"}
          </span>
        </div>

        {/* Hero balance */}
        <div className="flex flex-col items-center text-center mb-6">
          <ScrambleNumber
            value={status?.usdcBalance ?? 0}
            prefix="$"
            decimals={2}
            className="font-mono text-white text-[56px] sm:text-[80px] leading-none tracking-tight font-light"
          />
          <div
            className="mt-3 text-[12px] sm:text-[13px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {status ? formatBornAt(status.bornAt) : "—"}
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
          <StatusPill
            icon={
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#4ADE80" }}
              />
            }
            glow={(status?.workersActive ?? 0) > 0}
          >
            <span style={{ color: "rgba(255,255,255,0.95)" }}>
              {status?.workersActive ?? 0}
            </span>{" "}
            worker{status?.workersActive === 1 ? "" : "s"} active
          </StatusPill>
          <StatusPill icon={<span style={{ color: "#4ADE80" }}>↗</span>}>
            earning ${earningRate}/min
          </StatusPill>
          {status?.lastAction ? (
            <StatusPill icon={<span>{status.lastAction.emoji}</span>}>
              {status.lastAction.worker} {status.lastAction.verb} ·{" "}
              {agoLabel(status.lastAction.agoSeconds)}
            </StatusPill>
          ) : (
            <StatusPill icon={<span style={{ opacity: 0.6 }}>○</span>}>
              waiting for first action
            </StatusPill>
          )}
        </div>

        {/* Workers row */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {status?.workers && status.workers.length > 0 ? (
            <>
              {status.workers.slice(0, 8).map((w) => (
                <Link key={w.id} href={`/app/agents/${w.id}`}>
                  <WorkerAvatar emoji={w.emoji} thinking={w.isThinking} name={w.name} />
                </Link>
              ))}
              <Link
                href="/app/agents/spawn"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] transition active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.55)",
                }}
                title="Hire a worker"
              >
                +
              </Link>
            </>
          ) : (
            <Link
              href="/app/agents/spawn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] transition active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              <span>+</span> Hire your first worker
            </Link>
          )}
        </div>

        {/* PnL today + sparkline */}
        <div
          className="flex items-end justify-between pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <div
              className="text-[10px] font-mono uppercase"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em" }}
            >
              PnL today
            </div>
            <div
              className="font-mono text-[18px] mt-1"
              style={{ color: netColor, fontVariantNumeric: "tabular-nums" }}
            >
              {netPositive ? "+" : ""}${(status?.pnlToday.net ?? 0).toFixed(2)}
            </div>
          </div>
          <Sparkline
            values={status?.pnlSparkline ?? new Array(24).fill(0)}
            color={sparkColor}
            width={160}
            height={36}
          />
        </div>
      </div>
    </motion.div>
  );
}
