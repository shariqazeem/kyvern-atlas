"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "growth" | "warning" | "celebration" | "info";
  title: string;
  message: string;
  icon: string;
}

const TYPE_STYLES: Record<
  Insight["type"],
  { bg: string; border: string; badge: string; badgeText: string }
> = {
  growth: {
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
    badge: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
  warning: {
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    badge: "bg-amber-50",
    badgeText: "text-amber-700",
  },
  celebration: {
    bg: "bg-pulse-50/50",
    border: "border-pulse-100",
    badge: "bg-pulse-50",
    badgeText: "text-pulse-700",
  },
  info: {
    bg: "bg-[var(--surface-2)]/50",
    border: "border-slate-100",
    badge: "bg-[var(--surface-2)]",
    badgeText: "text-slate-700",
  },
};

export function RevenueNarrator() {
  const { isAuthenticated } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated) return;

      try {
        const url = "/api/pulse/insights";
        const res = await fetch(url, {
          method: forceRefresh ? "POST" : "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setInsights(data.insights || []);
      } catch (err) {
        console.error("Failed to fetch insights:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchInsights();
  }, [fetchInsights, isAuthenticated]);

  function handleRefresh() {
    setRefreshing(true);
    setDismissed(new Set());
    fetchInsights(true);
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  const visibleInsights = insights.filter((i) => !dismissed.has(i.id));

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-premium">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#F0F0F0] animate-pulse" />
            <div className="h-4 w-32 bg-[#F0F0F0] rounded animate-pulse" />
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#F0F0F0] animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-black/[0.04] p-3.5 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0F0F0] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 bg-[#F0F0F0] rounded" />
                  <div className="h-3 w-full bg-[#F0F0F0] rounded" />
                  <div className="h-3 w-2/3 bg-[#F0F0F0] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nothing to show
  if (visibleInsights.length === 0 && insights.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-premium"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pulse-400 to-pulse-600 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-[14px] font-semibold tracking-tight">
            AI Revenue Insights
          </h3>
          <span className="text-[10px] font-medium text-quaternary bg-[#F5F5F5] px-1.5 py-0.5 rounded">
            AUTO
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-quaternary hover:text-primary hover:bg-[#F5F5F5] transition-all duration-200 disabled:opacity-50"
          title="Refresh insights"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {/* Insights list */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {visibleInsights.map((insight, index) => {
            const styles = TYPE_STYLES[insight.type];
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.96 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                layout
                className={cn(
                  "group relative rounded-lg border p-3.5 transition-all duration-200",
                  styles.bg,
                  styles.border,
                  "hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${
                    insight.type === "growth" ? "bg-emerald-400" :
                    insight.type === "warning" ? "bg-amber-400" :
                    insight.type === "celebration" ? "bg-blue-400" :
                    "bg-slate-300"
                  }`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-primary tracking-tight">
                        {insight.title}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize",
                          styles.badge,
                          styles.badgeText
                        )}
                      >
                        {insight.type}
                      </span>
                    </div>
                    <p className="text-[12px] text-secondary leading-relaxed">
                      {insight.message}
                    </p>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="p-1 rounded text-quaternary opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-white/80 transition-all duration-200 shrink-0"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* All dismissed state */}
        {visibleInsights.length === 0 && insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-3"
          >
            <button
              onClick={handleRefresh}
              className="text-[12px] text-tertiary hover:text-pulse transition-colors"
            >
              All insights dismissed.{" "}
              <span className="underline">Refresh</span>
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
