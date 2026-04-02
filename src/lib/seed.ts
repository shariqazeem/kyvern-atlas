/**
 * Demo seed data generator — for development and demo only.
 * Real data comes from the withPulse() middleware intercepting x402 payments.
 * Seed data has source='seed', real data has source='middleware'.
 */
import { nanoid } from "nanoid";
import { getDb } from "./db";

const DEMO_API_KEY_ID = "demo_key_001";
const DEMO_API_KEY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // sha256 of "kv_demo_test_key"
const DEMO_API_KEY_PREFIX = "kv_demo_";

const ENDPOINTS = [
  { path: "/api/weather", label: "Weather Forecast", price: 0.05 },
  { path: "/api/search", label: "Web Search", price: 0.15 },
  { path: "/api/summarize", label: "Text Summarizer", price: 0.25 },
  { path: "/api/translate", label: "Translation", price: 0.08 },
  { path: "/api/sentiment", label: "Sentiment Analysis", price: 0.20 },
];

// Popularity weights (Zipf-like: search is most popular)
const ENDPOINT_WEIGHTS = [0.15, 0.35, 0.20, 0.18, 0.12];

const PAYER_ADDRESSES = Array.from({ length: 20 }, (_, i) => {
  const hex = (i * 7 + 42).toString(16).padStart(4, "0");
  return `0x${hex}${nanoid(8)}${nanoid(8)}${nanoid(8)}`.slice(0, 42);
});

// Some payers are "whales" — they make way more calls
const PAYER_WEIGHTS = PAYER_ADDRESSES.map((_, i) => {
  if (i < 3) return 0.15; // 3 whales = 45% of traffic
  if (i < 8) return 0.05; // 5 medium = 25%
  return 0.025; // 12 small = 30%
});

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function gaussianRandom(): number {
  // Box-Muller transform for realistic time-of-day distribution
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function seedDatabase() {
  const db = getDb();

  // Clear existing data
  db.exec("DELETE FROM events");
  db.exec("DELETE FROM endpoints");
  db.exec("DELETE FROM daily_stats");
  db.exec("DELETE FROM api_keys");

  // Insert demo API key
  db.prepare(
    "INSERT INTO api_keys (id, key_hash, key_prefix, name, email) VALUES (?, ?, ?, ?, ?)"
  ).run(DEMO_API_KEY_ID, DEMO_API_KEY_HASH, DEMO_API_KEY_PREFIX, "Demo Account", "demo@kyvernlabs.com");

  // Insert endpoints
  const insertEndpoint = db.prepare(
    "INSERT INTO endpoints (id, api_key_id, path, label, price_usd) VALUES (?, ?, ?, ?, ?)"
  );
  for (const ep of ENDPOINTS) {
    insertEndpoint.run(nanoid(), DEMO_API_KEY_ID, ep.path, ep.label, ep.price);
  }

  // Generate 60 days of events (so 30d range has a previous period for deltas)
  const now = new Date();
  const insertEvent = db.prepare(
    "INSERT INTO events (id, api_key_id, timestamp, endpoint, amount_usd, payer_address, latency_ms, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed')"
  );

  const TOTAL_DAYS = 60;

  const insertMany = db.transaction(() => {
    for (let dayOffset = TOTAL_DAYS - 1; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);

      // Growth curve: start at ~100 calls/day, ramp to ~400/day
      const growthFactor = 1 + (TOTAL_DAYS - 1 - dayOffset) / (TOTAL_DAYS - 1) * 3;
      const baseCalls = Math.round(100 * growthFactor);

      // Weekday bias: 1.3x on weekdays, 0.7x on weekends
      const dayOfWeek = date.getDay();
      const weekdayMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.3;

      const totalCalls = Math.round(jitter(baseCalls * weekdayMultiplier, 0.15));

      for (let i = 0; i < totalCalls; i++) {
        const endpoint = weightedPick(ENDPOINTS, ENDPOINT_WEIGHTS);
        const payer = weightedPick(PAYER_ADDRESSES, PAYER_WEIGHTS);

        // Time of day: peak at 14:00-16:00 UTC (gaussian centered at 15)
        const hourFloat = 15 + gaussianRandom() * 4;
        const hour = Math.max(0, Math.min(23, Math.round(hourFloat)));
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);

        const timestamp = new Date(date);
        timestamp.setHours(hour, minute, second);

        // Price with jitter (some endpoints have dynamic pricing)
        const amount = jitter(endpoint.price, 0.05);

        // Latency: base 50-200ms with jitter
        const baseLatency = 50 + Math.random() * 150;
        const latency = Math.round(jitter(baseLatency, 0.2));

        // 2% error rate
        const status = Math.random() < 0.02 ? "error" : "success";

        insertEvent.run(
          nanoid(),
          DEMO_API_KEY_ID,
          timestamp.toISOString(),
          endpoint.path,
          Math.round(amount * 1000) / 1000,
          payer,
          latency,
          status
        );
      }
    }
  });

  insertMany();

  // Build daily_stats from events
  db.exec(`
    INSERT OR REPLACE INTO daily_stats (id, api_key_id, date, endpoint, total_calls, total_revenue_usd, unique_payers, avg_latency_ms, error_count)
    SELECT
      api_key_id || '_' || date(timestamp) || '_' || endpoint,
      api_key_id,
      date(timestamp),
      endpoint,
      COUNT(*),
      ROUND(SUM(amount_usd), 4),
      COUNT(DISTINCT payer_address),
      ROUND(AVG(latency_ms), 1),
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)
    FROM events
    GROUP BY api_key_id, date(timestamp), endpoint
  `);

  // Count what was generated
  const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
  const totalRevenue = db.prepare("SELECT ROUND(SUM(amount_usd), 2) as total FROM events").get() as { total: number };

  return {
    events: eventCount.count,
    revenue: totalRevenue.total,
    endpoints: ENDPOINTS.length,
    payers: PAYER_ADDRESSES.length,
    days: TOTAL_DAYS,
  };
}
