import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "API Documentation — KyvernLabs",
  description: "x402 Market Data API documentation. Access aggregated ecosystem data for research, analysis, and integration.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v2/market?metric=overview",
    desc: "Ecosystem summary: total volume, transactions, endpoints, agents, providers, avg price.",
    params: [{ name: "range", values: "7d, 30d, 90d", default: "30d" }],
    example: `{
  "metric": "overview",
  "range": "30d",
  "data": {
    "total_transactions": 226,
    "total_volume": 3.91,
    "active_endpoints": 19,
    "unique_agents": 12,
    "providers": 3,
    "avg_price": 0.0173
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v2/market?metric=endpoints",
    desc: "Top 50 endpoints by volume with calls, revenue, avg price, unique agents.",
    params: [{ name: "range", values: "7d, 30d, 90d", default: "30d" }],
    example: `{
  "metric": "endpoints",
  "count": 19,
  "data": [
    { "endpoint": "/v1/translate", "calls": 70, "revenue": 0.21, "avg_price": 0.003, "unique_agents": 5 }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v2/market?metric=volume",
    desc: "Daily transaction count and volume for charting.",
    params: [{ name: "range", values: "7d, 30d, 90d", default: "30d" }],
    example: `{
  "metric": "volume",
  "data": [
    { "date": "2026-04-01", "transactions": 15, "volume": 0.201 }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v2/market?metric=categories",
    desc: "Endpoint categories with aggregated stats.",
    params: [{ name: "range", values: "7d, 30d, 90d", default: "30d" }],
    example: `{
  "metric": "categories",
  "data": [
    { "category": "AI / NLP", "calls": 108, "revenue": 0.644, "endpoints": 5 }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v2/market?metric=pricing",
    desc: "Pricing analysis: avg, min, max price per endpoint.",
    params: [{ name: "range", values: "7d, 30d, 90d", default: "30d" }],
    example: `{
  "metric": "pricing",
  "data": [
    { "endpoint": "/v1/translate", "avg_price": 0.003, "min_price": 0.003, "max_price": 0.003, "sample_size": 70 }
  ]
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] mb-2">
            Market Data API
          </h1>
          <p className="text-[15px] text-secondary mb-4">
            Access aggregated x402 ecosystem data. Free tier: 100 calls/day. With API key: 10,000 calls/day.
          </p>

          <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4 mb-10">
            <p className="text-[13px] font-medium mb-1">Base URL</p>
            <code className="text-[13px] font-mono text-pulse">https://kyvernlabs.com/api/v2/market</code>
            <p className="text-[12px] text-tertiary mt-2">
              Authentication is optional. Add <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">X-API-Key: kv_live_...</code> header for higher rate limits.
            </p>
          </div>

          <div className="space-y-10">
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                    {ep.method}
                  </span>
                  <code className="text-[13px] font-mono font-medium">{ep.path}</code>
                </div>
                <p className="text-[13px] text-secondary">{ep.desc}</p>

                {ep.params.length > 0 && (
                  <div className="rounded-lg bg-[#FAFAFA] p-3">
                    <p className="text-[11px] font-medium text-quaternary uppercase tracking-wider mb-2">Parameters</p>
                    {ep.params.map((p) => (
                      <div key={p.name} className="flex items-baseline gap-2 text-[12px]">
                        <code className="font-mono font-medium text-pulse">{p.name}</code>
                        <span className="text-tertiary">— {p.values}</span>
                        <span className="text-quaternary">(default: {p.default})</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-medium text-quaternary uppercase tracking-wider mb-1">Response</p>
                  <pre className="bg-[#09090B] text-gray-100 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
                    <code>{ep.example}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Rate Limits */}
          <div className="mt-12 rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium">
            <h2 className="text-[15px] font-semibold mb-3">Rate Limits</h2>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  <th className="text-left py-2 text-quaternary font-medium text-[11px] uppercase tracking-wider">Tier</th>
                  <th className="text-right py-2 text-quaternary font-medium text-[11px] uppercase tracking-wider">Limit</th>
                  <th className="text-left py-2 text-quaternary font-medium text-[11px] uppercase tracking-wider">Auth</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/[0.03]">
                  <td className="py-2">Free</td>
                  <td className="py-2 text-right font-mono-numbers">100/day</td>
                  <td className="py-2 text-tertiary">No key needed</td>
                </tr>
                <tr className="border-b border-black/[0.03]">
                  <td className="py-2">Authenticated</td>
                  <td className="py-2 text-right font-mono-numbers">10,000/day</td>
                  <td className="py-2 text-tertiary">X-API-Key header</td>
                </tr>
                <tr>
                  <td className="py-2">Enterprise</td>
                  <td className="py-2 text-right font-mono-numbers">Unlimited</td>
                  <td className="py-2 text-tertiary">Contact us</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
