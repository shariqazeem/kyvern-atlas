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
  // (idx_snapshots_wallet_ts is created further down, after wallet_snapshots exists)
  db.exec("CREATE INDEX IF NOT EXISTS idx_events_apikey_ts ON events(api_key_id, timestamp DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_stats_lookup ON daily_stats(api_key_id, date)");

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

  // Alerts column migration — add Slack/Discord notification URLs
  const alertCols = db.pragma("table_info(alerts)") as Array<{ name: string }>;
  const alertColNames = new Set(alertCols.map((c) => c.name));
  if (!alertColNames.has("slack_url")) {
    db.exec("ALTER TABLE alerts ADD COLUMN slack_url TEXT");
  }
  if (!alertColNames.has("discord_url")) {
    db.exec("ALTER TABLE alerts ADD COLUMN discord_url TEXT");
  }

  // Vault — wallet monitoring
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      address TEXT NOT NULL,
      label TEXT NOT NULL,
      network TEXT NOT NULL DEFAULT 'eip155:8453',
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
    CREATE INDEX IF NOT EXISTS idx_snapshots_wallet_ts ON wallet_snapshots(wallet_id, fetched_at DESC);
  `);

  // ─── KyvernLabs Vault (Solana + Squads v4 — the Visa for every AI agent) ───
  //
  // Core tables for the agent-wallet product. A `vault` is a Squads v4 smart
  // account delegated to a single AI agent with a hard spending limit, a
  // merchant allowlist, a velocity cap, and a kill switch. Every payment
  // attempt — allowed or blocked — is logged to `vault_payments` for audit.

  db.exec(`
    CREATE TABLE IF NOT EXISTS vaults (
      id                    TEXT PRIMARY KEY,
      owner_wallet          TEXT NOT NULL,
      name                  TEXT NOT NULL,
      emoji                 TEXT NOT NULL DEFAULT '🧭',
      purpose               TEXT NOT NULL DEFAULT 'research',

      -- Budgets, denominated in USD (USDC 1:1)
      daily_limit_usd       REAL NOT NULL DEFAULT 50,
      weekly_limit_usd      REAL NOT NULL DEFAULT 250,
      per_tx_max_usd        REAL NOT NULL DEFAULT 5,

      -- Velocity policy
      max_calls_per_window  INTEGER NOT NULL DEFAULT 60,
      velocity_window       TEXT NOT NULL DEFAULT '1h',  -- '1h' | '1d' | '1w'

      -- Merchant allowlist: JSON array of normalized hosts, [] = any host
      allowed_merchants     TEXT NOT NULL DEFAULT '[]',
      require_memo          INTEGER NOT NULL DEFAULT 1,

      -- Squads smart account
      squads_address        TEXT NOT NULL,
      network               TEXT NOT NULL DEFAULT 'devnet',  -- 'devnet' | 'mainnet'

      -- Kill switch
      paused_at             TEXT,

      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vaults_owner    ON vaults(owner_wallet);
    CREATE INDEX IF NOT EXISTS idx_vaults_squads   ON vaults(squads_address);
    CREATE INDEX IF NOT EXISTS idx_vaults_created  ON vaults(created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_agent_keys (
      id             TEXT PRIMARY KEY,
      vault_id       TEXT NOT NULL,
      key_hash       TEXT NOT NULL UNIQUE,
      key_prefix     TEXT NOT NULL,           -- first 14 chars for UI, e.g. 'kv_live_abc123'
      label          TEXT NOT NULL DEFAULT 'primary',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at   TEXT,
      revoked_at     TEXT,
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_keys_vault ON vault_agent_keys(vault_id);
    CREATE INDEX IF NOT EXISTS idx_agent_keys_hash  ON vault_agent_keys(key_hash);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_payments (
      id             TEXT PRIMARY KEY,
      vault_id       TEXT NOT NULL,
      agent_key_id   TEXT,
      merchant       TEXT NOT NULL,
      amount_usd     REAL NOT NULL,
      memo           TEXT,
      status         TEXT NOT NULL,           -- 'allowed' | 'blocked' | 'settled' | 'failed'
      reason         TEXT,                    -- policy-engine block reason or settle tx
      tx_signature   TEXT,                    -- Squads v4 tx sig when settled
      latency_ms     INTEGER,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_payments_vault     ON vault_payments(vault_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_status    ON vault_payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_merchant  ON vault_payments(merchant);
    CREATE INDEX IF NOT EXISTS idx_payments_ts        ON vault_payments(created_at DESC);
  `);

  // ─── Real Squads v4 on-chain storage ────────────────────────────────
  // When running in real mode we need to remember two things per vault:
  //   · spending_limit_pda      — the Squads SpendingLimit account
  //   · spending_limit_create_key — the random pubkey used to derive that PDA
  //                                  (re-deriving requires this seed)
  // And two things per agent key:
  //   · solana_pubkey           — the delegate pubkey on the spending limit
  //   · solana_secret_b58       — base58 secret key; server-side only
  //                               (never leaves the server)
  //
  // These columns are ALTER-added so existing DBs migrate in place.
  {
    const vCols = db.pragma("table_info(vaults)") as Array<{ name: string }>;
    const v = new Set(vCols.map((c) => c.name));
    if (!v.has("spending_limit_pda"))
      db.exec("ALTER TABLE vaults ADD COLUMN spending_limit_pda TEXT");
    if (!v.has("spending_limit_create_key"))
      db.exec("ALTER TABLE vaults ADD COLUMN spending_limit_create_key TEXT");
    if (!v.has("vault_pda"))
      db.exec("ALTER TABLE vaults ADD COLUMN vault_pda TEXT");
    if (!v.has("create_signature"))
      db.exec("ALTER TABLE vaults ADD COLUMN create_signature TEXT");
    if (!v.has("set_spending_limit_signature"))
      db.exec("ALTER TABLE vaults ADD COLUMN set_spending_limit_signature TEXT");

    const akCols = db.pragma("table_info(vault_agent_keys)") as Array<{ name: string }>;
    const ak = new Set(akCols.map((c) => c.name));
    if (!ak.has("solana_pubkey"))
      db.exec("ALTER TABLE vault_agent_keys ADD COLUMN solana_pubkey TEXT");
    if (!ak.has("solana_secret_b58"))
      db.exec("ALTER TABLE vault_agent_keys ADD COLUMN solana_secret_b58 TEXT");
  }

  // ─── Ability Store: user-created x402 endpoints + bounty targets ────
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_endpoints (
      id              TEXT PRIMARY KEY,
      vault_id        TEXT NOT NULL,
      target_url      TEXT NOT NULL,
      price_usd       REAL NOT NULL DEFAULT 0.001,
      active          INTEGER NOT NULL DEFAULT 1,
      greeted         INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_endpoints_vault ON user_endpoints(vault_id);
    CREATE INDEX IF NOT EXISTS idx_user_endpoints_active ON user_endpoints(active);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bounty_vaults (
      vault_id        TEXT PRIMARY KEY,
      enabled_at      TEXT NOT NULL DEFAULT (datetime('now')),
      attack_count    INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
  `);

  // ─── Device Log — the unified event feed for every device ────────
  // Every ability action, payment, attack, install writes here.
  // Powers: device home feed, public profile log, PnL aggregation.
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_log (
      id              TEXT PRIMARY KEY,
      device_id       TEXT NOT NULL,
      timestamp       TEXT NOT NULL DEFAULT (datetime('now')),
      event_type      TEXT NOT NULL,
      ability_id      TEXT,
      signature       TEXT,
      amount_usd      REAL,
      counterparty    TEXT,
      description     TEXT,
      metadata_json   TEXT,
      FOREIGN KEY (device_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_device_log_device ON device_log(device_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_device_log_type ON device_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_device_log_ability ON device_log(ability_id);
  `);

  // ─── Public mirror of installed abilities (for registry display) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_abilities_public (
      device_id       TEXT NOT NULL,
      ability_id      TEXT NOT NULL,
      installed_at    TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (device_id, ability_id),
      FOREIGN KEY (device_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
  `);

  // Add greeter_paid_at to user_endpoints if not present
  {
    const epCols = db.pragma("table_info(user_endpoints)") as Array<{ name: string }>;
    const epNames = new Set(epCols.map((c) => c.name));
    if (!epNames.has("greeter_paid_at")) {
      db.exec("ALTER TABLE user_endpoints ADD COLUMN greeter_paid_at TEXT");
    }
    if (!epNames.has("slug")) {
      db.exec("ALTER TABLE user_endpoints ADD COLUMN slug TEXT");
    }
  }

  // Add welcome_attack_sig to bounty_vaults if not present
  {
    const bvCols = db.pragma("table_info(bounty_vaults)") as Array<{ name: string }>;
    const bvNames = new Set(bvCols.map((c) => c.name));
    if (!bvNames.has("welcome_attack_sig")) {
      db.exec("ALTER TABLE bounty_vaults ADD COLUMN welcome_attack_sig TEXT");
    }
  }

  // ─── Agents — autonomous workers that live on devices ─────────────
  // Each agent has a personality, a job, allowed tools, and a frequency.
  // The agent-pool runner ticks each one — calls Claude, executes tools,
  // logs thoughts. A device can host multiple agents.
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id                  TEXT PRIMARY KEY,
      device_id           TEXT NOT NULL,
      name                TEXT NOT NULL,
      emoji               TEXT NOT NULL DEFAULT '✨',
      personality_prompt  TEXT NOT NULL,
      job_prompt          TEXT NOT NULL,
      allowed_tools       TEXT NOT NULL DEFAULT '[]',
      template            TEXT NOT NULL DEFAULT 'custom',
      frequency_seconds   INTEGER NOT NULL DEFAULT 180,
      status              TEXT NOT NULL DEFAULT 'alive',
      created_at          INTEGER NOT NULL,
      last_thought_at     INTEGER,
      total_thoughts      INTEGER NOT NULL DEFAULT 0,
      total_earned_usd    REAL NOT NULL DEFAULT 0,
      total_spent_usd     REAL NOT NULL DEFAULT 0,
      is_public           INTEGER NOT NULL DEFAULT 1,
      metadata_json       TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (device_id) REFERENCES vaults(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agents_device ON agents(device_id);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_agents_template ON agents(template);
  `);

  // Agent thoughts — one row per decision cycle.
  // Stores reasoning + decision + tool used + signature if action produced one.
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_thoughts (
      id              TEXT PRIMARY KEY,
      agent_id        TEXT NOT NULL,
      timestamp       INTEGER NOT NULL,
      thought         TEXT NOT NULL,
      decision_json   TEXT,
      tool_used       TEXT,
      signature       TEXT,
      amount_usd      REAL,
      counterparty    TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_thoughts_agent_time ON agent_thoughts(agent_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_thoughts_signature ON agent_thoughts(signature);
  `);

  // Agent status updates — ephemeral, narrate-the-worker rows used by
  // the agent detail page during the first-60s "boot sequence". Each
  // row is a single line shown in the BootSequence stack ("waking up",
  // "checking the source you pointed me at", etc).
  //
  // kind:
  //   'boot' — pre-scripted timeline beats written by /api/agents/spawn,
  //            with future created_at offsets that unfold across ~45s
  //   'tick' — real activity beats written by the runner during a tick
  //            (used for the LiveWorkerCard state pill after first
  //            thought lands)
  //
  // GC: rows older than 5 minutes are deleted on read.
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_status_updates (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT NOT NULL,
      message     TEXT NOT NULL,
      kind        TEXT NOT NULL DEFAULT 'boot',
      step_index  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_status_updates_agent_time
      ON agent_status_updates(agent_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_status_updates_kind
      ON agent_status_updates(agent_id, kind, step_index);
  `);

  // Agent chat — synchronous user ↔ agent conversations.
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_chat_messages (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      timestamp   INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chat_agent_time ON agent_chat_messages(agent_id, timestamp DESC);
  `);

  // Signals — Path C inbox. Workers produce structured findings (vs.
  // free-form chat). Each row = one thing the owner should read.
  // device_id is denormalized for fast inbox queries per device.
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id              TEXT PRIMARY KEY,
      agent_id        TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      kind            TEXT NOT NULL,
      subject         TEXT NOT NULL,
      evidence_json   TEXT NOT NULL,
      suggestion      TEXT,
      signature       TEXT,
      source_url      TEXT,
      status          TEXT NOT NULL DEFAULT 'unread',
      created_at      INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_signals_device_time ON signals(device_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_agent_time ON signals(agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(device_id, status, created_at DESC);
  `);

  // watch_url cache — per-(agent_id, url), so the watch_url tool can
  // answer sinceLastCheck=true and only return new items.
  db.exec(`
    CREATE TABLE IF NOT EXISTS watch_url_cache (
      agent_id          TEXT NOT NULL,
      url               TEXT NOT NULL,
      last_response_hash TEXT,
      last_seen_ids     TEXT,           -- JSON array of stable ids/links seen
      last_check_at     INTEGER NOT NULL,
      PRIMARY KEY (agent_id, url),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);

  // Agent tasks — the cross-agent task economy.
  // One agent posts a task with a bounty, another claims and completes it.
  // Settlement uses serverVaultPay() — real USDC moves between vaults.
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id                    TEXT PRIMARY KEY,
      posting_agent_id      TEXT NOT NULL,
      task_type             TEXT NOT NULL,
      payload_json          TEXT NOT NULL,
      bounty_usd            REAL NOT NULL,
      status                TEXT NOT NULL DEFAULT 'open',
      claiming_agent_id     TEXT,
      result_json           TEXT,
      payment_signature     TEXT,
      created_at            INTEGER NOT NULL,
      expires_at            INTEGER NOT NULL,
      completed_at          INTEGER,
      FOREIGN KEY (posting_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (claiming_agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status_time ON agent_tasks(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_posting ON agent_tasks(posting_agent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_claiming ON agent_tasks(claiming_agent_id);
  `);

  // Backfill Atlas as the first agent (template='atlas').
  // Uses Atlas's vault id and its actual April 20 ignition timestamp.
  // INSERT OR IGNORE so re-running migrate is safe.
  const atlasIgnition = new Date("2026-04-20T17:55:22.402Z").getTime();
  db.prepare(`
    INSERT OR IGNORE INTO agents (
      id, device_id, name, emoji, personality_prompt, job_prompt,
      allowed_tools, template, frequency_seconds, status, created_at,
      total_thoughts, total_earned_usd, total_spent_usd, is_public, metadata_json
    ) VALUES (
      'agt_atlas', 'vlt_QcCPbp3XTzHtF5', 'Atlas', '🧭',
      'You are an autonomous research agent. You make decisions every few minutes about what data to buy, what to publish, and what to ignore. You think out loud — one paragraph of reasoning per cycle. You are calm, methodical, and disciplined about staying within your daily budget.',
      'Buy intelligence from research APIs. Cross-check signals. Publish a forecast to permanent storage. Self-report each cycle.',
      '["read_onchain","subscribe_to_agent","expose_paywall","message_user","post_task","claim_task"]',
      'atlas', 180, 'alive', ?,
      0, 0, 0, 1, '{}'
    )
  `).run(atlasIgnition);

  // Ensure demo API key exists (needed for middleware ingest + demo endpoint)
  db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, key_hash, key_prefix, name, email)
    VALUES ('demo_key_001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'kv_demo_', 'Pulse Demo', 'demo@kyvernlabs.com')
  `).run();

  // Per-session migrations — additive, idempotent.
  const tryAlter = (sql: string) => {
    try { db.exec(sql); } catch { /* already applied */ }
  };
  // mode: 'llm' | 'scripted' — populated at write time so the detail
  // page can render the green "mode: llm" pill on cards that came from
  // the LLM path and a subtle muted pill on the scripted fallback.
  tryAlter(`ALTER TABLE agent_thoughts ADD COLUMN mode TEXT DEFAULT 'llm'`);

  // signals.subject_hash — used for server-side dedup at writeSignal()
  // time. Workers (especially Token Pulse) sometimes re-emit the same
  // finding many times even though the system prompt forbids it. We
  // gate at the storage layer: same (agent_id, kind, subject_hash)
  // within the per-kind dedup window → drop, return existing signal.
  // Hash matches the JS hashSubject(): lower(trim(subject)) trimmed
  // to 80 chars. Using SQL lower(trim()) on the substring would clip
  // BEFORE casing, producing a different hash, so do it in this order.
  tryAlter(`ALTER TABLE signals ADD COLUMN subject_hash TEXT`);
  tryAlter(
    `CREATE INDEX IF NOT EXISTS idx_signals_dedup ON signals(agent_id, kind, subject_hash, created_at)`,
  );
  // Backfill — one-time, idempotent (only updates rows where the
  // column is still NULL). Cheap on the production signals table
  // (~hundreds of rows). Matches the JS implementation exactly.
  try {
    db.exec(
      `UPDATE signals SET subject_hash = substr(lower(trim(subject)), 1, 80) WHERE subject_hash IS NULL`,
    );
  } catch {
    /* if the column doesn't exist yet on a stale connection, retry next boot */
  }
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
