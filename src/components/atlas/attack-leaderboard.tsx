"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <AttackLeaderboard/> — the running scoreboard.
 *
 * Sits beside <AttackAtlas/> on /atlas. Shows:
 *   · Big number: attacks survived this week (NumberScramble for landing drama)
 *   · Breakdown by type (rogue-merchant / over-cap / prompt-injection / slow-drain)
 *   · Source split (scheduled attacker vs public probes)
 *   · Funds lost: always $0 if Kyvern is doing its job
 *   · All-time attacks + rough funds-protected estimate
 *
 * Polls /api/atlas/leaderboard every 5s — cheap, SQL aggregates only.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

interface LeaderboardData {
  weekly: {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  };
  allTime: {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  };
  fundsLostUsd: number;
  fundsProtectedUsd: number;
}

const TYPE_LABELS: Record<string, string> = {
  rogue_merchant: "Rogue merchant",
  over_cap: "Over-cap drain",
  prompt_injection: "Prompt injection",
  missing_memo: "Missing memo",
};

export function AttackLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/atlas/leaderboard");
        if (!r.ok) return;
        const j = (await r.json()) as LeaderboardData;
        if (!cancelled) setData(j);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const weekly = data?.weekly ?? { total: 0, byType: {}, bySource: {} };
  const allTime = data?.allTime ?? { total: 0, byType: {}, bySource: {} };

  // Sorted type rows (desc by count).
  const typeRows = Object.entries(weekly.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          borderBottom: "0.5px solid var(--border-subtle)",
          background: "var(--success-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="w-4 h-4"
            style={{ color: "var(--success-deep)" }}
          />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--success-deep)" }}
          >
            Defense record
          </span>
        </div>
        <span
          className="text-[11px] font-mono-numbers tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          last 7 days
        </span>
      </div>

      <div className="px-6 py-5">
        {/* Big weekly number */}
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
          style={{ color: "var(--text-quaternary)" }}
        >
          Attacks survived this week
        </p>
        <p
          className="text-[44px] md:text-[56px] font-mono-numbers tabular-nums tracking-[-0.03em] leading-none"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          <NumberScramble value={weekly.total} format={fmtInt} />
        </p>
        <p
          className="mt-1 text-[13px] leading-[1.5]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Every one of them a real failed transaction on Solana devnet.{" "}
          <span style={{ color: "var(--success-deep)", fontWeight: 600 }}>
            {fmtUsd(data?.fundsLostUsd ?? 0)}
          </span>{" "}
          lost to exploits.
        </p>

        {/* Breakdown by type */}
        <div className="mt-5 space-y-2.5">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            By attack type
          </p>
          {typeRows.length === 0 ? (
            <div
              className="text-[12px] italic"
              style={{ color: "var(--text-tertiary)" }}
            >
              Awaiting the first probe of the week…
            </div>
          ) : (
            <ul className="space-y-1.5">
              {typeRows.map(([type, count]) => {
                const pct =
                  weekly.total > 0 ? (count / weekly.total) * 100 : 0;
                return (
                  <li key={type}>
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-[12.5px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {TYPE_LABELS[type] ?? type}
                      </span>
                      <span
                        className="text-[11.5px] font-mono-numbers tabular-nums"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {fmtInt(count)}
                      </span>
                    </div>
                    <div
                      className="mt-1 h-[3px] rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "var(--attack)",
                          width: `${pct}%`,
                          transition: "width 400ms ease",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Source split — "how many were visitors" */}
        <div
          className="mt-5 grid grid-cols-2 gap-2"
          style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: 16 }}
        >
          <MiniStat
            label="Scheduled attacker"
            value={weekly.bySource["scheduled"] ?? 0}
          />
          <MiniStat
            label="Visitor probes"
            value={weekly.bySource["public"] ?? 0}
            tone="agent"
          />
        </div>

        {/* All-time footer */}
        <div
          className="mt-5 pt-4 flex items-baseline justify-between"
          style={{ borderTop: "0.5px solid var(--border-subtle)" }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-quaternary)" }}
            >
              Since ignition
            </p>
            <p
              className="text-[18px] font-mono-numbers tabular-nums"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              {fmtInt(allTime.total)} refused
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-quaternary)" }}
            >
              Protected
            </p>
            <p
              className="text-[18px] font-mono-numbers tabular-nums"
              style={{ color: "var(--success-deep)", fontWeight: 500 }}
            >
              {fmtUsd(data?.fundsProtectedUsd ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "agent";
}) {
  const color =
    tone === "agent" ? "var(--agent)" : "var(--text-primary)";
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </p>
      <p
        className="text-[16px] font-mono-numbers tabular-nums mt-0.5"
        style={{ color, fontWeight: 500 }}
      >
        <NumberScramble value={value} format={fmtInt} />
      </p>
    </div>
  );
}
