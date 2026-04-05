import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { getDb } from "@/lib/db";
import { Shield, Globe, Activity, TrendingUp, Check } from "lucide-react";

interface Props {
  params: { wallet: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const wallet = params.wallet;
  return {
    title: `x402 Provider ${wallet.slice(0, 10)}... — KyvernLabs Pulse`,
    description: `Verified x402 service provider tracked by KyvernLabs Pulse. On-chain verified revenue analytics.`,
  };
}

export default function ProviderProfilePage({ params }: Props) {
  const wallet = params.wallet.toLowerCase();
  const db = getDb();

  // Get provider's public stats (aggregated, no sensitive data)
  const account = db.prepare(
    "SELECT id FROM accounts WHERE wallet_address = ?"
  ).get(wallet) as { id: string } | undefined;

  if (!account) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-36 pb-24 px-6 text-center">
          <Shield className="w-12 h-12 text-quaternary mx-auto mb-4" />
          <h1 className="text-[20px] font-semibold">Provider not found</h1>
          <p className="text-[14px] text-tertiary mt-2">
            This wallet address is not registered on KyvernLabs Pulse.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Get API key for this wallet
  const apiKey = db.prepare(
    "SELECT id FROM api_keys WHERE wallet_address = ? LIMIT 1"
  ).get(wallet) as { id: string } | undefined;

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-36 pb-24 px-6 text-center">
          <Shield className="w-12 h-12 text-quaternary mx-auto mb-4" />
          <h1 className="text-[20px] font-semibold">No data yet</h1>
          <p className="text-[14px] text-tertiary mt-2">This provider has not started tracking with Pulse.</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Aggregate public stats
  const stats = db.prepare(`
    SELECT COUNT(*) as total_calls,
           ROUND(SUM(amount_usd), 2) as total_revenue,
           COUNT(DISTINCT endpoint) as endpoints,
           COUNT(DISTINCT payer_address) as unique_agents,
           MIN(timestamp) as first_seen
    FROM events WHERE api_key_id = ?
  `).get(apiKey.id) as {
    total_calls: number;
    total_revenue: number;
    endpoints: number;
    unique_agents: number;
    first_seen: string | null;
  };

  const topEndpoints = db.prepare(`
    SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue
    FROM events WHERE api_key_id = ?
    GROUP BY endpoint ORDER BY calls DESC LIMIT 5
  `).all(apiKey.id) as Array<{ endpoint: string; calls: number; revenue: number }>;

  const sub = db.prepare(
    "SELECT plan FROM subscriptions WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now') LIMIT 1"
  ).get(wallet) as { plan: string } | undefined;

  const truncated = wallet.slice(0, 6) + "..." + wallet.slice(-4);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Provider header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-pulse-50 flex items-center justify-center">
              <Shield className="w-7 h-7 text-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold font-mono">{truncated}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider">
                  <Check className="w-2.5 h-2.5" /> Pulse Verified
                </span>
                {sub && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pulse-50 text-pulse-600 text-[10px] font-semibold uppercase tracking-wider">
                    {sub.plan === "pro" ? "Pro" : "Growth"}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-tertiary mt-0.5">
                x402 service provider tracked by KyvernLabs Pulse
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Activity, label: "Transactions", value: stats.total_calls.toLocaleString() },
              { icon: Globe, label: "Endpoints", value: String(stats.endpoints) },
              { icon: TrendingUp, label: "Unique Agents", value: String(stats.unique_agents) },
              { icon: Shield, label: "Since", value: stats.first_seen ? new Date(stats.first_seen).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-black/[0.06] bg-white p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <s.icon className="w-4 h-4 text-quaternary mb-2" />
                <p className="text-[18px] font-semibold font-mono-numbers">{s.value}</p>
                <p className="text-[11px] text-quaternary mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Endpoints */}
          {topEndpoints.length > 0 && (
            <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden mb-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div className="px-5 py-4 border-b border-black/[0.04]">
                <h2 className="text-[14px] font-semibold">Active Endpoints</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-2.5">Endpoint</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-2.5">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {topEndpoints.map((ep) => (
                    <tr key={ep.endpoint} className="border-b border-black/[0.03] last:border-0">
                      <td className="px-5 py-3 font-mono text-[12px]">{ep.endpoint}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{ep.calls.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verified badge */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-[13px] font-semibold text-emerald-700">Pulse Verified</span>
            </div>
            <p className="text-[12px] text-emerald-600">
              This x402 service provider&apos;s transactions are tracked and verified on-chain by KyvernLabs Pulse.
            </p>
            <p className="text-[11px] text-emerald-500 mt-2">
              Embed this badge: <code className="font-mono bg-white/50 px-1.5 py-0.5 rounded">&lt;a href=&quot;kyvernlabs.com/provider/{truncated}&quot;&gt;Pulse Verified&lt;/a&gt;</code>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
