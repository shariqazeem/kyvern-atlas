"use client";

/**
 * 24h PnL sparkline. Single thin line, 1.5px stroke, soft area gradient
 * underneath. Value array is 24 hourly cumulative-net buckets — Atlas
 * mostly spends, so the line slopes down. Honest picture, not vanity.
 */

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function AtlasPnlSparkline({
  values,
  color = "#86EFAC",
  width = 280,
  height = 56,
  className,
}: SparklineProps) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;
  const gradId = `atlas-spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className={className}>
      <svg width={width} height={height} className="block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeOpacity={0.85}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
