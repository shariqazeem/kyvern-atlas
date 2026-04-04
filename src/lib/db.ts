import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.PULSE_DB_PATH || path.join(process.cwd(), "pulse.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      path TEXT NOT NULL,
      label TEXT,
      price_usd REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(api_key_id, path)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      payer_address TEXT NOT NULL,
      latency_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'success',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_api_key ON events(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_endpoint ON events(endpoint);
    CREATE INDEX IF NOT EXISTS idx_events_payer ON events(payer_address);

    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      date TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      total_calls INTEGER NOT NULL DEFAULT 0,
      total_revenue_usd REAL NOT NULL DEFAULT 0,
      unique_payers INTEGER NOT NULL DEFAULT 0,
      avg_latency_ms REAL,
      error_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(api_key_id, date, endpoint)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(api_key_id, date);
  `);

  // x402 column migration — add blockchain-specific fields
  const columns = db.pragma("table_info(events)") as Array<{ name: string }>;
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("network")) {
    db.exec("ALTER TABLE events ADD COLUMN network TEXT");
  }
  if (!columnNames.has("asset")) {
    db.exec("ALTER TABLE events ADD COLUMN asset TEXT");
  }
  if (!columnNames.has("tx_hash")) {
    db.exec("ALTER TABLE events ADD COLUMN tx_hash TEXT");
  }
  if (!columnNames.has("scheme")) {
    db.exec("ALTER TABLE events ADD COLUMN scheme TEXT");
  }
  if (!columnNames.has("source")) {
    db.exec("ALTER TABLE events ADD COLUMN source TEXT DEFAULT 'seed'");
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON events(tx_hash)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_events_source ON events(source)");

  // Composite indexes for query performance
  db.exec("CREATE INDEX IF NOT EXISTS idx_events_apikey_ts ON events(api_key_id, timestamp DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_stats_lookup ON daily_stats(api_key_id, date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_snapshots_wallet_ts ON wallet_snapshots(wallet_id, fetched_at DESC)");

  // Waitlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      role TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Subscriptions table — x402-native billing
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'pro',
      tx_hash TEXT NOT NULL,
      network TEXT,
      amount_usd REAL NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_subs_wallet ON subscriptions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
  `);

  // Accounts table — wallet = identity
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_accounts_wallet ON accounts(wallet_address);
  `);

  // Sessions table — SIWE authenticated sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions(wallet_address);
  `);

  // Add wallet_address and tier to api_keys if not present
  const akCols = db.pragma("table_info(api_keys)") as Array<{ name: string }>;
  const akColNames = new Set(akCols.map((c) => c.name));
  if (!akColNames.has("wallet_address")) {
    db.exec("ALTER TABLE api_keys ADD COLUMN wallet_address TEXT");
  }
  if (!akColNames.has("tier")) {
    db.exec("ALTER TABLE api_keys ADD COLUMN tier TEXT DEFAULT 'free'");
  }
  if (!akColNames.has("key_full")) {
    db.exec("ALTER TABLE api_keys ADD COLUMN key_full TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(wallet_address)");

  // Webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '["payment.received"]',
      secret TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_triggered_at TEXT,
      failure_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON webhooks(api_key_id);
  `);

  // Webhook deliveries log
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      response_status INTEGER,
      response_body TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      webhook_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      trigger_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_api_key ON alerts(api_key_id);
  `);

  // Vault — wallet monitoring
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      address TEXT NOT NULL,
      label TEXT NOT NULL,
      network TEXT NOT NULL DEFAULT 'eip155:84532',
      purpose TEXT NOT NULL DEFAULT 'receivable',
      endpoint TEXT,
      is_monitored INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_wallets_api_key ON wallets(api_key_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_snapshots (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      balance_eth REAL NOT NULL DEFAULT 0,
      balance_usdc REAL NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_wallet ON wallet_snapshots(wallet_id);
  `);

  // Ensure demo API key exists (needed for middleware ingest + demo endpoint)
  db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, key_hash, key_prefix, name, email)
    VALUES ('demo_key_001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'kv_demo_', 'Pulse Demo', 'demo@kyvernlabs.com')
  `).run();
}

// --- Benchmark Queries (cross-user market intelligence) ---

export interface MarketBenchmark {
  endpoint: string;
  avg_price: number;
  median_price: number;
  p25_price: number;
  p75_price: number;
  total_calls: number;
  provider_count: number;
  avg_latency: number;
}

export interface UserPricingComparison {
  endpoint: string;
  user_price: number;
  market_avg: number;
  market_median: number;
  percentile_rank: number;
  status: "competitive" | "above_market" | "below_market";
}

export function getMarketBenchmarks(): {
  benchmarks: MarketBenchmark[];
  market_stats: { total_endpoints: number; total_providers: number; avg_price: number; data_points: number };
} {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get all endpoints with aggregate stats (across ALL users)
  const rows = db.prepare(`
    SELECT
      endpoint,
      AVG(amount_usd) as avg_price,
      COUNT(*) as total_calls,
      COUNT(DISTINCT api_key_id) as provider_count,
      ROUND(AVG(latency_ms), 0) as avg_latency
    FROM events
    WHERE timestamp >= ?
    GROUP BY endpoint
    ORDER BY total_calls DESC
  `).all(thirtyDaysAgo) as Array<{
    endpoint: string;
    avg_price: number;
    total_calls: number;
    provider_count: number;
    avg_latency: number;
  }>;

  // For each endpoint, compute percentiles from individual event prices
  const benchmarks: MarketBenchmark[] = rows.map((row) => {
    const prices = db.prepare(
      "SELECT amount_usd FROM events WHERE endpoint = ? AND timestamp >= ? ORDER BY amount_usd"
    ).all(row.endpoint, thirtyDaysAgo) as Array<{ amount_usd: number }>;

    const priceArr = prices.map((p) => p.amount_usd);
    const n = priceArr.length;

    return {
      endpoint: row.endpoint,
      avg_price: Math.round(row.avg_price * 10000) / 10000,
      median_price: n > 0 ? priceArr[Math.floor(n / 2)] : 0,
      p25_price: n > 0 ? priceArr[Math.floor(n * 0.25)] : 0,
      p75_price: n > 0 ? priceArr[Math.floor(n * 0.75)] : 0,
      total_calls: row.total_calls,
      provider_count: row.provider_count,
      avg_latency: row.avg_latency || 0,
    };
  });

  // Market-wide stats
  const globalStats = db.prepare(`
    SELECT
      COUNT(DISTINCT endpoint) as total_endpoints,
      COUNT(DISTINCT api_key_id) as total_providers,
      AVG(amount_usd) as avg_price,
      COUNT(*) as data_points
    FROM events WHERE timestamp >= ?
  `).get(thirtyDaysAgo) as { total_endpoints: number; total_providers: number; avg_price: number; data_points: number };

  return {
    benchmarks,
    market_stats: {
      total_endpoints: globalStats.total_endpoints,
      total_providers: globalStats.total_providers,
      avg_price: Math.round((globalStats.avg_price || 0) * 10000) / 10000,
      data_points: globalStats.data_points,
    },
  };
}

export function getUserPricingComparison(apiKeyId: string): UserPricingComparison[] {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get user's endpoints with their average price
  const userEndpoints = db.prepare(`
    SELECT endpoint, AVG(amount_usd) as user_price
    FROM events
    WHERE api_key_id = ? AND timestamp >= ?
    GROUP BY endpoint
  `).all(apiKeyId, thirtyDaysAgo) as Array<{ endpoint: string; user_price: number }>;

  return userEndpoints.map((ue) => {
    // Get ALL prices for this endpoint across the market
    const prices = db.prepare(
      "SELECT amount_usd FROM events WHERE endpoint = ? AND timestamp >= ? ORDER BY amount_usd"
    ).all(ue.endpoint, thirtyDaysAgo) as Array<{ amount_usd: number }>;

    const priceArr = prices.map((p) => p.amount_usd);
    const n = priceArr.length;

    const marketAvg = n > 0 ? priceArr.reduce((a, b) => a + b, 0) / n : 0;
    const marketMedian = n > 0 ? priceArr[Math.floor(n / 2)] : 0;
    const p25 = n > 0 ? priceArr[Math.floor(n * 0.25)] : 0;
    const p75 = n > 0 ? priceArr[Math.floor(n * 0.75)] : 0;

    // Calculate percentile rank (what % of the market is priced below the user)
    const belowCount = priceArr.filter((p) => p < ue.user_price).length;
    const percentileRank = n > 0 ? Math.round((belowCount / n) * 100) : 50;

    const status: "competitive" | "above_market" | "below_market" =
      ue.user_price > p75 ? "above_market" :
      ue.user_price < p25 ? "below_market" : "competitive";

    return {
      endpoint: ue.endpoint,
      user_price: Math.round(ue.user_price * 10000) / 10000,
      market_avg: Math.round(marketAvg * 10000) / 10000,
      market_median: Math.round(marketMedian * 10000) / 10000,
      percentile_rank: percentileRank,
      status,
    };
  });
}
