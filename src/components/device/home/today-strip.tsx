"use client";

/**
 * TodayStrip — small "today's hunt" stat row that sits between the
 * orbit and the inbox preview. Three mono stats with hairline dividers.
 * Reads straight from the live-status payload — no extra round-trip.
 */

interface TodayStripProps {
  earnedToday: number;
  spentToday: number;
  signalsToday: number;
  workersActive: number;
}

export function TodayStrip({
  earnedToday,
  spentToday,
  signalsToday,
  workersActive,
}: TodayStripProps) {
  const stats: Array<{ label: string; value: string; tone?: string }> = [
    {
      label: "earned",
      value: `+$${earnedToday.toFixed(2)}`,
      tone: earnedToday > 0 ? "#15803D" : "#0A0A0A",
    },
    {
      label: "spent",
      value: `$${spentToday.toFixed(2)}`,
    },
    {
      label: "signals",
      value: `${signalsToday}`,
    },
    {
      label: "workers",
      value: `${workersActive}`,
    },
  ];

  return (
    <div
      className="w-full grid grid-cols-4 rounded-[14px] overflow-hidden"
      style={{
        background: "rgba(15,23,42,0.02)",
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="px-2 py-2.5 flex flex-col items-center text-center"
          style={
            i > 0
              ? { borderLeft: "1px solid rgba(15,23,42,0.05)" }
              : undefined
          }
        >
          <span
            className="font-mono text-[14px]"
            style={{
              color: s.tone ?? "#0A0A0A",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {s.value}
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.14em] mt-0.5"
            style={{ color: "#9CA3AF" }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
