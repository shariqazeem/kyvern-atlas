// Raw x402 payment event from middleware
export interface PulseEvent {
  id: string;
  api_key_id: string;
  timestamp: string; // ISO 8601
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  latency_ms: number;
  status: "success" | "error" | "timeout";
  metadata?: string; // JSON blob
  created_at: string;
  // x402 blockchain fields
  network?: string; // CAIP-2 format, e.g. "eip155:84532"
  asset?: string; // token contract address
  tx_hash?: string; // blockchain transaction hash
  scheme?: string; // "exact" or "upto"
  source?: "seed" | "middleware";
}

// Registered x402 endpoint
export interface PulseEndpoint {
  id: string;
  api_key_id: string;
  path: string;
  label: string | null;
  price_usd: number | null;
  created_at: string;
}

// API key record
export interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  email: string | null;
  created_at: string;
  last_used_at: string | null;
}

// Pre-aggregated daily stats
export interface DailyStat {
  id: string;
  api_key_id: string;
  date: string; // YYYY-MM-DD
  endpoint: string;
  total_calls: number;
  total_revenue_usd: number;
  unique_payers: number;
  avg_latency_ms: number | null;
  error_count: number;
}

// --- API Response Types ---

export interface StatsResponse {
  revenue: number;
  calls: number;
  customers: number;
  avg_price: number;
  deltas: {
    revenue_pct: number;
    calls_pct: number;
    customers_pct: number;
    avg_price_pct: number;
  };
  has_real_data: boolean;
  source_breakdown: Record<string, number>;
}

export interface EndpointStats {
  path: string;
  label: string | null;
  calls: number;
  revenue: number;
  avg_latency: number;
  error_rate: number;
  last_called: string;
}

export interface EndpointsResponse {
  endpoints: EndpointStats[];
}

export interface CustomerStats {
  address: string;
  total_spent: number;
  call_count: number;
  first_seen: string;
  last_seen: string;
  top_endpoint: string;
}

export interface CustomersResponse {
  customers: CustomerStats[];
}

export interface TimeseriesPoint {
  timestamp: string;
  revenue: number;
  calls: number;
}

export interface TimeseriesResponse {
  data: TimeseriesPoint[];
  granularity: "hour" | "day";
}

export type TimeRange = "24h" | "7d" | "30d";

// Recent transaction (individual event with x402 details)
export interface RecentTransaction {
  id: string;
  timestamp: string;
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  latency_ms: number;
  status: string;
  network?: string;
  asset?: string;
  tx_hash?: string;
  scheme?: string;
  source?: string;
}

export interface RecentTransactionsResponse {
  transactions: RecentTransaction[];
}

// Network metadata
export interface NetworkConfig {
  name: string;
  chainId: string;
  explorerUrl: string;
}
