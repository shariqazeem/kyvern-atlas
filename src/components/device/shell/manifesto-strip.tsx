"use client";

/**
 * ManifestoStrip — Phase 5 (Device Shell Redesign).
 *
 *   $5/day cap · chain decides every dollar · everything else stops
 *
 * Single line, full-width, centered, low-emphasis. Sits between the
 * main grid and the bottom tab bar. Replaces the multi-line manifesto
 * block from the legacy BottomRail composition.
 */

interface Props {
  className?: string;
}

export function ManifestoStrip({ className }: Props) {
  return (
    <div
      className={`flex items-center justify-center text-center px-4 ${className ?? ""}`}
      style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
    >
      <p
        className="font-mono uppercase tracking-[0.18em]"
        style={{
          fontSize: 9.5,
          color: "rgba(15,23,42,0.40)",
        }}
      >
        $5/day cap · chain decides every dollar · everything else stops
      </p>
    </div>
  );
}
