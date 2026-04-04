"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Copy, Check, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ApiKeyInfo {
  id: string;
  key_prefix: string;
  key_full: string | null;
  name: string;
  tier: string;
  created_at: string;
  last_used_at: string | null;
}

export default function KeysPage() {
  const { apiKey, clearApiKey } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showNewKey, setShowNewKey] = useState(!!apiKey);

  useEffect(() => {
    fetch("/api/auth/keys", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-[#F0F0F0] dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-40 bg-[#F0F0F0] dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">API Keys</h1>
        <p className="text-[13px] text-tertiary mt-0.5">
          Use these keys in your <code className="text-[12px] font-mono bg-[#F0F0F0] dark:bg-gray-700 px-1 py-0.5 rounded">withPulse()</code> middleware configuration.
        </p>
      </div>

      {/* New key banner (shown once for new users) */}
      {showNewKey && apiKey && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-[13px] font-semibold text-emerald-800">
              Your API key (shown once — copy it now)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-emerald-200 p-3">
            <code className="flex-1 text-[13px] font-mono text-primary break-all">
              {revealed ? apiKey : apiKey.replace(/./g, "•").slice(0, 20) + apiKey.slice(-4)}
            </code>
            <button onClick={() => setRevealed(!revealed)} className="p-1.5 rounded hover:bg-emerald-50 transition-colors">
              {revealed ? <EyeOff className="w-3.5 h-3.5 text-tertiary" /> : <Eye className="w-3.5 h-3.5 text-tertiary" />}
            </button>
            <button
              onClick={() => copyToClipboard(apiKey, "new-key")}
              className="p-1.5 rounded hover:bg-emerald-50 transition-colors"
            >
              {copied === "new-key" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-tertiary" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600">
            This key will not be shown again. Store it securely.
          </p>
          <button
            onClick={() => { setShowNewKey(false); clearApiKey(); }}
            className="mt-3 text-[12px] font-medium text-emerald-700 hover:underline"
          >
            I&apos;ve copied it — dismiss
          </button>
        </motion.div>
      )}

      {/* Keys table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white shadow-premium overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.04] dark:border-gray-800">
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Key</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Name</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Created</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Last Used</th>
                <th className="text-right text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-black/[0.03] dark:border-gray-800/50 last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-quaternary" />
                      <code className="text-[12px] font-mono text-primary">
                        {key.key_full || `${key.key_prefix}...`}
                      </code>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-secondary">{key.name}</td>
                  <td className="px-5 py-3 text-[12px] text-tertiary">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-tertiary">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => copyToClipboard(key.key_full || key.key_prefix, key.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-pulse hover:text-pulse-600 transition-colors"
                    >
                      {copied === key.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied === key.id ? "Copied!" : "Copy key"}
                    </button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-tertiary">
                    No API keys found. This shouldn&apos;t happen — try refreshing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
