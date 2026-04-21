"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Copy, Check, Eye, EyeOff, Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";

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
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/keys", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRotate() {
    if (!rotateTarget) return;
    setRotating(true);
    setRotateTarget(null);
    try {
      const res = await fetch("/api/auth/keys/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key_id: rotateTarget }),
      });
      const data = await res.json();
      if (data.full_key) {
        setRotatedKey(data.full_key);
        fetch("/api/auth/keys", { credentials: "include" })
          .then((r) => r.json())
          .then((d) => setKeys(d.keys || []));
      }
    } catch { /* ignore */ }
    finally { setRotating(false); }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="h-40 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="pt-2"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
          style={{ color: "#0EA5E9" }}
        >
          Earn · service keys
        </p>
        <h1
          className="tracking-[-0.035em] text-balance"
          style={{
            fontSize: "clamp(30px, 4.2vw, 42px)",
            lineHeight: 1.02,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Service API keys.
        </h1>
        <p
          className="mt-2 text-[14.5px] leading-[1.55] max-w-[580px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Use these keys in your <code className="code-inline">withPulse()</code> middleware configuration.
        </p>
      </motion.div>

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
          <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
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

      {/* Rotated key banner */}
      {rotatedKey && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-[13px] font-semibold text-emerald-800">
              New API key generated — copy it now
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
            <code className="flex-1 text-[13px] font-mono text-primary break-all">{rotatedKey}</code>
            <button
              onClick={() => { copyToClipboard(rotatedKey, "rotated"); }}
              className="p-1.5 rounded hover:bg-emerald-50 transition-colors"
            >
              {copied === "rotated" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-tertiary" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600">
            This key will not be shown again. The old key has been revoked.
          </p>
          <button
            onClick={() => setRotatedKey(null)}
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
        className="rounded-xl border border-black/[0.06] bg-white shadow-premium overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Key</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Name</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Created</th>
                <th className="text-left text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Last Used</th>
                <th className="text-right text-[11px] font-medium text-quaternary px-5 py-3 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-black/[0.03]/50 last:border-0 hover:bg-[#FAFAFA] transition-colors">
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
                    <div className="flex items-center justify-end gap-2">
                      {key.key_full ? (
                        <button
                          onClick={() => copyToClipboard(key.key_full!, key.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-pulse hover:text-pulse-600 transition-colors"
                        >
                          {copied === key.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copied === key.id ? "Copied!" : "Copy key"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-quaternary">Key hidden</span>
                      )}
                      <button
                        onClick={() => setRotateTarget(key.id)}
                        disabled={rotating}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-tertiary hover:text-primary transition-colors"
                        title="Generate a new key (old key stops working)"
                      >
                        <RefreshCw className={`w-3 h-3 ${rotating ? "animate-spin" : ""}`} />
                        Rotate
                      </button>
                    </div>
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
      <ConfirmModal
        open={!!rotateTarget}
        title="Rotate API Key"
        description="The old key will stop working immediately. Any middleware using the current key will need to be updated."
        confirmLabel="Rotate Key"
        variant="warning"
        onConfirm={handleRotate}
        onCancel={() => setRotateTarget(null)}
      />
    </div>
  );
}
