import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

interface DailyRow {
  date: string;
  revenue: number;
}

interface ForecastPoint {
  date: string;
  expected: number;
  optimistic: number;
  conservative: number;
}

/**
 * Linear regression: y = mx + b
 * Returns slope (m) and intercept (b) using least-squares method.
 */
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const apiKeyId = auth.apiKeyId;

    const db = getDb();

    // Get last 14 days of daily revenue
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const rows = db.prepare(`
      SELECT
        date(timestamp) as date,
        ROUND(SUM(amount_usd), 4) as revenue
      FROM events
      WHERE api_key_id = ? AND timestamp >= ?
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all(apiKeyId, fourteenDaysAgo) as DailyRow[];

    // Need at least 7 days of data for a meaningful forecast
    if (rows.length < 7) {
      return NextResponse.json({
        historical: rows.map((r) => ({ date: r.date, revenue: r.revenue })),
        forecast: [],
        insufficient_data: true,
      });
    }

    // Prepare points for regression (x = day index, y = revenue)
    const points = rows.map((r, i) => ({ x: i, y: r.revenue }));
    const { slope, intercept } = linearRegression(points);

    // Project 7 days forward
    const forecast: ForecastPoint[] = [];
    const lastDate = new Date(rows[rows.length - 1].date);

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      const dateStr = forecastDate.toISOString().split("T")[0];

      const x = rows.length - 1 + i;
      const expected = Math.max(0, slope * x + intercept);
      const optimistic = Math.max(0, expected * 1.3);
      const conservative = Math.max(0, expected * 0.7);

      forecast.push({
        date: dateStr,
        expected: Math.round(expected * 10000) / 10000,
        optimistic: Math.round(optimistic * 10000) / 10000,
        conservative: Math.round(conservative * 10000) / 10000,
      });
    }

    return NextResponse.json({
      historical: rows.map((r) => ({ date: r.date, revenue: r.revenue })),
      forecast,
      trend: {
        slope: Math.round(slope * 10000) / 10000,
        direction: slope > 0.001 ? "up" : slope < -0.001 ? "down" : "flat",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
