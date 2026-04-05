"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FlaskConical, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ProGate } from "@/components/dashboard/pro-gate";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ExperimentOverview {
  endpoint: string;
  price_variants: number;
  total_calls: number;
  total_revenue: number;
  min_price: number;
  max_price: number;
}

interface PriceAnalysis {
  price_point: number;
  total_calls: number;
  unique_payers: number;
  total_revenue: number;
  avg_latency: number;
  errors: number;
  repeat_rate: number;
}

function ExperimentsContent() {
  const [experiments, setExperiments] = useState<ExperimentOverview[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PriceAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/pulse/experiments", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setExperiments(d.experiments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function selectEndpoint(endpoint: string) {
    setSelected(endpoint);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/pulse/experiments?endpoint=${encodeURIComponent(endpoint)}`, { credentials: "include" });
      const data = await res.json();
      setAnalysis(data.analysis || []);
    } catch {
      setAnalysis([]);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="h-64 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Pricing Experiments</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Analyze how different price points affect revenue, volume, and customer retention.
        </p>
      </div>

      {/* Endpoint list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {experiments.map((exp) => (
          <motion.button
            key={exp.endpoint}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => selectEndpoint(exp.endpoint)}
            className={`text-left rounded-xl border p-4 transition-all hover:shadow-premium ${
              selected === exp.endpoint ? "border-pulse bg-pulse-50/20 ring-1 ring-pulse/20" : "border-black/[0.06] bg-white"
            }`}
          >
            <p className="font-mono text-[12px] font-medium truncate">{exp.endpoint}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-quaternary">{exp.total_calls} calls</span>
              <span className="text-[11px] text-quaternary">{formatCurrency(exp.total_revenue)} rev</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <DollarSign className="w-3 h-3 text-quaternary" />
              <span className="text-[10px] text-quaternary">
                {formatCurrency(exp.min_price)} — {formatCurrency(exp.max_price)}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {experiments.length === 0 && (
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center">
          <FlaskConical className="w-10 h-10 text-quaternary mx-auto mb-3" />
          <p className="text-[14px] font-medium">No pricing data yet</p>
          <p className="text-[12px] text-tertiary mt-1">Start receiving payments at different price points to see analysis here.</p>
        </div>
      )}

      {/* Detail view */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="rounded-xl border border-black/[0.06] bg-white overflow-hidden shadow-premium"
        >
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold">Price Analysis: <span className="font-mono">{selected}</span></h3>
              <p className="text-[11px] text-tertiary mt-0.5">How different price points perform for this endpoint</p>
            </div>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center">
              <div className="h-32 bg-[#F0F0F0] rounded-xl animate-pulse" />
            </div>
          ) : analysis.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-tertiary">No price variation data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Price Point</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Calls</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Revenue</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Unique Agents</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Repeat Rate</th>
                    <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.map((a) => {
                    const best = analysis.reduce((b, c) => c.total_revenue > b.total_revenue ? c : b);
                    const isBest = a.price_point === best.price_point;
                    return (
                      <tr key={a.price_point} className={`border-b border-black/[0.03] last:border-0 ${isBest ? "bg-emerald-50/30" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-numbers text-[13px] font-medium">{formatCurrency(a.price_point)}</span>
                            {isBest && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">Best</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{a.total_calls}</td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px] font-medium">{formatCurrency(a.total_revenue)}</td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{a.unique_payers}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-mono-numbers text-[12px] ${a.repeat_rate > 50 ? "text-emerald-600" : a.repeat_rate > 20 ? "text-amber-600" : "text-tertiary"}`}>
                            {a.repeat_rate}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{a.avg_latency}ms</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {analysis.length > 1 && !detailLoading && (
            <div className="px-5 py-4 border-t border-black/[0.04] bg-[#FAFAFA]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-pulse" />
                <p className="text-[12px] text-secondary">
                  <strong>Insight:</strong> {(() => {
                    const best = analysis.reduce((b, c) => c.total_revenue > b.total_revenue ? c : b);
                    const alt = analysis.find((a) => a.price_point !== best.price_point && a.total_calls > 5);
                    if (!alt) return `${formatCurrency(best.price_point)} is your best-performing price point.`;
                    return `${formatCurrency(best.price_point)}/call generates the most revenue. Consider testing a price between ${formatCurrency(Math.min(best.price_point, alt.price_point))} and ${formatCurrency(Math.max(best.price_point, alt.price_point))} to optimize.`;
                  })()}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <ProGate feature="Pricing experiments let you analyze how different price points affect revenue, volume, and customer retention across your x402 endpoints.">
      <ExperimentsContent />
    </ProGate>
  );
}
