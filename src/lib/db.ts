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

  // Ensure demo API key exists (needed for middleware ingest + demo endpoint)
  db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, key_hash, key_prefix, name, email)
    VALUES ('demo_key_001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'kv_demo_', 'Pulse Demo', 'demo@kyvernlabs.com')
  `).run();
}
