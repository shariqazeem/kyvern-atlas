"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Share2, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  formatCurrency,
  getExplorerTxUrl,
} from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Moment {
  id: string;
  type: "new_agent" | "milestone" | "record_payment" | "hot_endpoint" | "whale_alert" | "comeback";
  emoji: string;
  title: string;
  description: string;
  amount_usd: number | null;
  endpoint: string | null;
  agent_address: string | null;
  tx_hash: string | null;
  timestamp: string;
}

interface MoneyMomentsProps {
  limit?: number;
  showViewAll?: boolean;
}

function MomentSkeleton() {
  return (
    <div className="flex gap-3 p-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-[#F0F0F0] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-[#F0F0F0] rounded" />
        <div className="h-3 w-48 bg-[#F0F0F0] rounded" />
      </div>
    </div>
  );
}

function ShareButton({ moment }: { moment: Moment }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const lines = [
      `${moment.title}`,
      moment.description,
    ];
    if (moment.amount_usd) {
      lines.push(`Amount: ${formatCurrency(moment.amount_usd)}`);
    }
    lines.push("", "Powered by @KyvernLabs Pulse");

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 text-[10px] font-medium text-quaternary hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-[#F0F0F0]"
      title="Copy to clipboard for sharing"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-500">Copied</span>
        </>
      ) : (
        <>
          <Share2 className="w-3 h-3" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}

function MomentCard({ moment, index }: { moment: Moment; index: number }) {
  const timeAgo = formatDistanceToNow(parseISO(moment.timestamp), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex gap-3 p-3 rounded-lg hover:bg-[#FAFAFA] transition-colors group"
    >
      {/* Type indicator */}
      <div className={`w-10 h-10 rounded-xl border border-black/[0.04] flex items-center justify-center text-[10px] font-bold uppercase tracking-wider shrink-0 ${
        moment.type === "new_agent" ? "bg-blue-50 text-blue-500" :
        moment.type === "milestone" ? "bg-emerald-50 text-emerald-500" :
        moment.type === "record_payment" ? "bg-amber-50 text-amber-500" :
        moment.type === "hot_endpoint" ? "bg-orange-50 text-orange-500" :
        moment.type === "whale_alert" ? "bg-purple-50 text-purple-500" :
        "bg-slate-50 text-slate-400"
      }`}>
        {moment.type === "new_agent" ? "NEW" :
         moment.type === "milestone" ? "GOAL" :
         moment.type === "record_payment" ? "REC" :
         moment.type === "hot_endpoint" ? "HOT" :
         moment.type === "whale_alert" ? "TOP" :
         "EVT"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[13px] font-medium text-primary truncate">
            {moment.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ShareButton moment={moment} />
          </div>
        </div>

        <p className="text-[12px] text-tertiary mt-0.5 truncate">
          {moment.description}
        </p>

        <div className="flex items-center gap-3 mt-1.5">
          {moment.amount_usd !== null && (
            <span className="text-[11px] font-mono-numbers font-medium text-primary">
              {formatCurrency(moment.amount_usd)}
            </span>
          )}

          {moment.tx_hash && (
            <a
              href={getExplorerTxUrl(moment.tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[10px] text-pulse hover:underline"
            >
              BaseScan
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          <span className="text-[10px] text-quaternary">{timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function MoneyMoments({ limit = 20, showViewAll = false }: MoneyMomentsProps) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchMoments = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/pulse/moments", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setMoments(json.moments || []);
      }
    } catch (err) {
      console.error("Failed to fetch moments:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMoments();
  }, [fetchMoments, isAuthenticated]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-premium"
      >
        <div className="h-4 w-32 bg-[#F0F0F0] rounded mb-4 animate-pulse" />
        <div className="space-y-1">
          {[...Array(Math.min(limit, 3))].map((_, i) => (
            <MomentSkeleton key={i} />
          ))}
        </div>
      </motion.div>
    );
  }

  const displayMoments = moments.slice(0, limit);

  if (displayMoments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-premium"
      >
        <h3 className="text-[12px] font-medium text-quaternary mb-4">Money Moments</h3>
        <div className="h-[120px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">&#x1F4B0;</div>
            <p className="text-[12px] text-tertiary">
              Moments appear as revenue events happen
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-medium text-quaternary">Money Moments</h3>
        {showViewAll && moments.length > limit && (
          <button className="text-[11px] text-pulse hover:underline font-medium">
            View all
          </button>
        )}
      </div>

      <div className="space-y-0.5 -mx-2">
        {displayMoments.map((moment, i) => (
          <MomentCard key={moment.id} moment={moment} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
