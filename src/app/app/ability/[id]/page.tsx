"use client";

/**
 * /app/ability/[id] — Installed ability management.
 *
 * Per-ability view: status, PnL, config, activity, pause/uninstall.
 * Tap an ability icon on the device home screen → land here.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { getAbility } from "@/lib/abilities/registry";
import { useDeviceStore } from "@/hooks/use-device-store";
import { ConfigFields } from "@/components/store/config-fields";
import { fmtAgo } from "@/lib/format";

interface AtlasDecision {
  id: string;
  decidedAt: string;
  reasoning: string;
  action: string;
  merchant: string | null;
  amountUsd: number;
  outcome: string;
  txSignature: string | null;
}

export default function InstalledAbilityPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const ability = getAbility(params.id);
  const { getInstalled, toggleStatus, updateConfig, uninstall } =
    useDeviceStore();
  const installed = getInstalled(params.id);

  // Atlas Intelligence: fetch Atlas decisions
  const [atlasDecisions, setAtlasDecisions] = useState<AtlasDecision[]>([]);
  useEffect(() => {
    if (params.id !== "atlas-intelligence") return;
    fetch("/api/atlas/decisions?kind=decisions&limit=10")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.feed) setAtlasDecisions(d.feed as AtlasDecision[]);
      })
      .catch(() => {});
  }, [params.id]);

  const handleToggle = useCallback(() => {
    toggleStatus(params.id);
  }, [toggleStatus, params.id]);

  const handleUninstall = useCallback(() => {
    if (confirm("Uninstall this ability?")) {
      uninstall(params.id);
      router.push("/app");
    }
  }, [uninstall, params.id, router]);

  const handleConfigChange = useCallback(
    (key: string, value: string | number | boolean) => {
      if (!installed) return;
      const newConfig = { ...installed.config, [key]: value };
      updateConfig(params.id, newConfig);
    },
    [installed, updateConfig, params.id],
  );

  if (!ability || !installed) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px] text-[#6B7280]">
          {!ability ? "Ability not found." : "Not installed."}
        </p>
        <Link
          href="/app"
          className="text-[13px] text-[#111] underline mt-2 inline-block"
        >
          Back to device
        </Link>
      </div>
    );
  }

  const isActive = installed.status === "active";

  return (
    <div className="py-2">
      {/* Back */}
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF] mb-4 hover:text-[#6B7280]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-5"
      >
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[24px]"
          style={{ background: "#F3F4F6" }}
        >
          {ability.emoji}
        </div>
        <div className="flex-1">
          <h1 className="text-[18px] font-semibold text-[#111]">
            {ability.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: isActive ? "#22C55E" : "#9CA3AF",
              }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: isActive ? "#22C55E" : "#9CA3AF" }}
            >
              {isActive ? "Active" : "Paused"}
            </span>
            <span className="text-[10px] text-[#D1D5DB]">·</span>
            <span className="text-[10px] text-[#9CA3AF]">
              Installed {fmtAgo(installed.installedAt)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="flex gap-2 mb-5"
      >
        <button
          onClick={handleToggle}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-[12px] text-[12px] font-semibold transition-all active:scale-[0.97]"
          style={{
            background: isActive ? "#F3F4F6" : "#F0FDF4",
            color: isActive ? "#6B7280" : "#22C55E",
          }}
        >
          {isActive ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isActive ? "Pause" : "Resume"}
        </button>
        <button
          onClick={handleUninstall}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] text-[12px] font-medium transition-all active:scale-[0.97]"
          style={{ background: "#FEF2F2", color: "#EF4444" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Uninstall
        </button>
      </motion.div>

      {/* Config */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-[16px] p-4 mb-5"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
          Configuration
        </h2>
        <ConfigFields
          schema={ability.configSchema}
          values={installed.config}
          onChange={handleConfigChange}
        />
      </motion.div>

      {/* Atlas Intelligence: show feed */}
      {params.id === "atlas-intelligence" && atlasDecisions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-[16px] overflow-hidden mb-5"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div className="px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Atlas Feed
            </h2>
          </div>
          {atlasDecisions.map((d, i) => (
            <div
              key={d.id}
              className="px-4 py-2.5 flex items-start gap-3"
              style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}
            >
              <span
                className="w-[5px] h-[5px] rounded-full mt-1.5 shrink-0"
                style={{
                  background:
                    d.outcome === "settled" ? "#22C55E" : "#9CA3AF",
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#111] truncate">
                  {d.reasoning}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  {d.merchant ?? d.action} · {fmtAgo(d.decidedAt)}
                </p>
              </div>
              {d.amountUsd > 0 && (
                <span className="text-[11px] font-mono text-[#111] shrink-0">
                  ${d.amountUsd.toFixed(2)}
                </span>
              )}
              {d.txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${d.txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D1D5DB] hover:text-[#9CA3AF] shrink-0"
                >
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* On-chain proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="rounded-[12px] p-3"
        style={{ background: "#F9FAFB" }}
      >
        <p className="text-[10px] text-[#9CA3AF] leading-[1.5]">
          <span className="font-semibold text-[#6B7280]">
            On-chain proof:
          </span>{" "}
          {ability.onChainProof}
        </p>
      </motion.div>
    </div>
  );
}
