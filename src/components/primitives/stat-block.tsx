"use client";

/**
 * StatBlock — number above label. The rule: numbers ALWAYS larger than labels.
 * Three sizes: sm (inline), md (card), lg (hero).
 */

interface StatBlockProps {
  value: string;
  label: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  delta?: string;
  deltaColor?: string;
}

const SIZES = {
  sm: { value: "text-[14px]", label: "text-[9px]" },
  md: { value: "text-[20px]", label: "text-[10px]" },
  lg: { value: "text-[32px]", label: "text-[11px]" },
};

export function StatBlock({
  value,
  label,
  color = "#0A0A0A",
  size = "md",
  delta,
  deltaColor = "#00A86B",
}: StatBlockProps) {
  const s = SIZES[size];
  return (
    <div className="text-center">
      <p className={`${s.value} font-semibold font-mono`} style={{ color }}>
        {value}
      </p>
      <p
        className={`${s.label} font-medium uppercase tracking-[0.08em] mt-0.5`}
        style={{ color: "#9B9B9B" }}
      >
        {label}
      </p>
      {delta && (
        <p className="text-[9px] font-mono mt-0.5" style={{ color: deltaColor }}>
          {delta}
        </p>
      )}
    </div>
  );
}
