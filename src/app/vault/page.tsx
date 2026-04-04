"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Plus, Trash2, RefreshCw, ExternalLink, AlertCircle, Loader2,
  DollarSign, Coins, Eye,
} from "lucide-react";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface WalletData {
  id: string;
  address: string;
  label: string;
  network: string;
  purpose: string;
  endpoint: string | null;
  balance_eth: number | null;
  balance_usdc: number | null;
  last_synced: string | null;
}

function AddWalletForm({ onAdded }: { onAdded: () => void }) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("receivable");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ address, label, purpose }),
      });
      const d = await res.json();
      if (d.wallet) { setAddress(""); setLabel(""); setOpen(false); onAdded(); }
      else setError(d.error || d.details?.[0]?.message || "Failed");
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add Wallet
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <h3 className="text-[14px] font-semibold tracking-tight">Add Wallet to Monitor</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[12px] text-tertiary font-medium mb-1">Wallet Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..."
            className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 dark:bg-gray-800 text-[13px] font-mono placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20" />
        </div>
        <div>
          <label className="block text-[12px] text-tertiary font-medium mb-1">Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main Revenue"
            className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 dark:bg-gray-800 text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20" />
        </div>
      </div>
      <div>
        <label className="block text-[12px] text-tertiary font-medium mb-1">Purpose</label>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}
          className="h-9 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 dark:bg-gray-800 text-[12px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pulse/20">
          <option value="receivable">Receivable (x402 payments)</option>
          <option value="gas">Gas (transaction fees)</option>
          <option value="operational">Operational</option>
        </select>
      </div>
      {error && <p className="text-[12px] text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={add} disabled={loading || !address || !label}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {loading ? "Adding..." : "Add Wallet"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[12px] text-tertiary hover:text-primary transition-colors">Cancel</button>
      </div>
    </motion.div>
  );
}

function VaultContent() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [totalUsdc, setTotalUsdc] = useState(0);
  const [totalEth, setTotalEth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    fetch("/api/vault/wallets", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setWallets(d.wallets || []);
        setTotalUsdc(d.total_balance_usdc || 0);
        setTotalEth(d.total_balance_eth || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function syncAll() {
    setSyncing(true);
    await fetch("/api/vault/wallets/sync", { method: "POST", credentials: "include" });
    load();
    setSyncing(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this wallet?")) return;
    await fetch(`/api/vault/wallets?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-[#F0F0F0] dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const lowFundsCount = wallets.filter((w) => (w.balance_usdc || 0) < 0.01 && w.balance_usdc !== null).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Vault</h1>
          <p className="text-[13px] text-tertiary mt-1">Monitor your x402 wallets. Track balances. Stay funded.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncAll} disabled={syncing}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[12px] font-medium text-secondary hover:text-primary disabled:opacity-50 transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync All"}
          </button>
          <AddWalletForm onAdded={load} />
        </div>
      </div>

      {/* Portfolio cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, label: "USDC Balance", value: `$${totalUsdc.toFixed(2)}`, sub: "Across all wallets" },
          { icon: Coins, label: "ETH Balance", value: `${totalEth.toFixed(4)} ETH`, sub: "Across all wallets" },
          { icon: Eye, label: "Wallets Monitored", value: wallets.length.toString(), sub: lowFundsCount > 0 ? `${lowFundsCount} low funds` : "All healthy" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
            className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-quaternary" />
              <span className="text-[11px] text-quaternary font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-[22px] font-bold font-mono-numbers tracking-tight">{card.value}</p>
            <p className="text-[11px] text-quaternary mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Wallet list */}
      {wallets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        >
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-gray-800">
            <h3 className="text-[14px] font-semibold tracking-tight">Your Wallets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-black/[0.04] dark:border-gray-800">
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Address</th>
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Label</th>
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Purpose</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">USDC</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">ETH</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Status</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => {
                  const isLow = (w.balance_usdc || 0) < 0.01 && w.balance_usdc !== null;
                  return (
                    <tr key={w.id} className={cn(
                      "border-b border-black/[0.03] dark:border-gray-800/50 dark:border-gray-800 last:border-0 transition-colors",
                      isLow ? "bg-amber-50/50 dark:bg-amber-900/10" : "hover:bg-[#FAFAFA] dark:hover:bg-gray-800"
                    )}>
                      <td className="px-5 py-3">
                        <a href={`https://sepolia.basescan.org/address/${w.address}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[12px] text-pulse hover:underline">
                          {truncateAddress(w.address, 8)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-medium">{w.label}</td>
                      <td className="px-3 py-3">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          w.purpose === "receivable" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" :
                          w.purpose === "gas" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
                          "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                        )}>{w.purpose}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers text-[12px] font-medium">
                        ${(w.balance_usdc || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers text-[12px] text-tertiary">
                        {(w.balance_eth || 0).toFixed(4)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                            <AlertCircle className="w-3 h-3" /> Low
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => remove(w.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <Wallet className="w-10 h-10 text-quaternary mx-auto mb-3" />
          <p className="text-[14px] font-medium">No wallets monitored</p>
          <p className="text-[12px] text-tertiary mt-1">Add your x402 payment wallets to track balances and get low-funds alerts.</p>
        </div>
      )}
    </div>
  );
}

export default function VaultPage() {
  return (
    <ConnectGate>
      <VaultContent />
    </ConnectGate>
  );
}
