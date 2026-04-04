"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Copy, Check, Trash2, AlertTriangle, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { truncateAddress } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function SettingsPage() {
  const { wallet, plan, proExpiresAt } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  function copyWallet() {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function exportAllData() {
    setExporting(true);
    // Download all 3 CSV types
    window.open("/api/pulse/export?type=transactions&range=90d", "_blank");
    setTimeout(() => window.open("/api/pulse/export?type=endpoints", "_blank"), 500);
    setTimeout(() => window.open("/api/pulse/export?type=customers", "_blank"), 1000);
    setTimeout(() => setExporting(false), 2000);
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Settings</h1>
        <p className="text-[13px] text-tertiary mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-6"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-quaternary" />
          <h3 className="text-[14px] font-semibold tracking-tight">Profile</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-tertiary">Wallet Address</span>
            <button onClick={copyWallet} className="flex items-center gap-2 text-[13px] font-mono">
              {wallet ? truncateAddress(wallet, 10) : "Not connected"}
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-quaternary" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-tertiary">Plan</span>
            <span className="text-[13px] font-medium">{plan === "pro" ? "Pro" : "Free"}</span>
          </div>
          {proExpiresAt && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-tertiary">Pro Expires</span>
              <span className="text-[13px] font-mono text-tertiary">{new Date(proExpiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-6"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight mb-4">Data Management</h3>
        <button
          onClick={exportAllData}
          disabled={exporting || plan !== "pro"}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-black/[0.08] text-[12px] font-medium text-secondary hover:text-primary disabled:opacity-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Exporting..." : "Export All Data (CSV)"}
        </button>
        {plan !== "pro" && (
          <p className="text-[11px] text-quaternary mt-2">CSV export requires Pulse Pro.</p>
        )}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease }}
        className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-[14px] font-semibold tracking-tight text-red-700 dark:text-red-400">Danger Zone</h3>
        </div>
        <p className="text-[12px] text-red-600/70 dark:text-red-400/70 mb-4 leading-relaxed">
          Deleting your account will permanently remove all your data: events, endpoints, customers, API keys, webhooks, alerts, and subscriptions. This cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="h-9 px-3 rounded-lg border border-red-200 dark:border-red-800 dark:bg-red-900/20 text-[13px] placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-200 w-48"
          />
          <button
            onClick={deleteAccount}
            disabled={deleteConfirm !== "DELETE" || deleting}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-red-600 text-white text-[12px] font-medium hover:bg-red-700 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
