"use client";

/**
 * KeysModal — manage BYOK provider keys.
 *
 * Sections:
 *   1. List of stored keys (provider, label, masked value, last test)
 *      Each row: Test button + Delete button
 *   2. Add new: provider dropdown + label + plaintext input + Save
 *
 * Server side encrypts at rest. UI never sees decrypted keys.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";
import type { LlmProvider } from "@/lib/agents/graph/types";
import type { ProviderKeyRow, ProviderKeyTestStatus } from "@/lib/agents/graph/keys-store";

interface Props {
  open: boolean;
  ownerWallet: string | null;
  onClose: () => void;
}

export function KeysModal({ open, ownerWallet, onClose }: Props) {
  const [keys, setKeys] = useState<ProviderKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!ownerWallet) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/keys/providers`, {
        headers: { "x-owner-wallet": ownerWallet },
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error ?? `fetch failed (${r.status})`);
      setKeys(data.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerWallet]);

  async function testKey(id: string) {
    if (!ownerWallet) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/keys/providers/${id}/test`, {
        method: "POST",
        headers: { "x-owner-wallet": ownerWallet },
      });
      const data = await r.json();
      if (!r.ok && r.status !== 200) {
        setError(data.error ?? `test failed (${r.status})`);
      }
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deleteKey(id: string, label: string) {
    if (!ownerWallet) return;
    if (!confirm(`Delete "${label}"?`)) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/keys/providers/${id}`, {
        method: "DELETE",
        headers: { "x-owner-wallet": ownerWallet },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? `delete failed (${r.status})`);
      }
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center pointer-events-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative w-full max-w-[640px] flex flex-col pointer-events-auto"
              style={{
                background: "#FFFFFF",
                borderRadius: 18,
                margin: 16,
                maxHeight: "calc(100vh - 32px)",
                boxShadow: "0 24px 80px -16px rgba(15,23,42,0.40)",
                overflow: "hidden",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
              >
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: "#0A0A0A" }}>
                    Provider keys
                  </h2>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(15,23,42,0.55)" }}>
                    Bring your own Anthropic / OpenAI / DeepSeek / Commonstack key. Encrypted at rest.
                  </p>
                </div>
                <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {error && (
                  <div
                    className="rounded-[10px] px-3 py-2 text-[12px]"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.30)",
                      color: "#B91C1C",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Existing keys */}
                {loading ? (
                  <p className="text-[12px]" style={{ color: "rgba(15,23,42,0.55)" }}>
                    Loading…
                  </p>
                ) : keys.length === 0 ? (
                  <div
                    className="rounded-[10px] py-4 text-center"
                    style={{
                      background: "rgba(15,23,42,0.02)",
                      border: "1px dashed rgba(15,23,42,0.15)",
                    }}
                  >
                    <p className="text-[12.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
                      No keys yet. Add one below to use LLM steps.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {keys.map((k) => (
                      <KeyRow
                        key={k.id}
                        keyRow={k}
                        busy={busy === k.id}
                        onTest={() => testKey(k.id)}
                        onDelete={() => deleteKey(k.id, k.label)}
                      />
                    ))}
                  </div>
                )}

                {/* Add form */}
                <div
                  className="rounded-[10px] p-3"
                  style={{
                    background: "rgba(34,197,94,0.04)",
                    border: "1px solid rgba(34,197,94,0.20)",
                  }}
                >
                  {!adding ? (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium"
                      style={{ color: "#15803D" }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add a provider key
                    </button>
                  ) : (
                    <AddKeyForm
                      ownerWallet={ownerWallet}
                      onCancel={() => setAdding(false)}
                      onAdded={() => {
                        setAdding(false);
                        void refresh();
                      }}
                      onError={setError}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function KeyRow({
  keyRow,
  busy,
  onTest,
  onDelete,
}: {
  keyRow: ProviderKeyRow;
  busy: boolean;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-[10px] flex items-center gap-2 px-3 py-2"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <ProviderBadge provider={keyRow.provider} />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium tracking-[-0.005em] truncate" style={{ color: "#0A0A0A" }}>
          {keyRow.label}
        </div>
        <div className="text-[10.5px] font-mono" style={{ color: "rgba(15,23,42,0.55)" }}>
          ···{keyRow.keyLast4}
        </div>
      </div>
      <TestStatusBadge status={keyRow.lastTestStatus} />
      <button
        type="button"
        onClick={onTest}
        disabled={busy}
        className="px-2 py-1 rounded text-[10.5px] font-medium hover:bg-slate-50 disabled:opacity-50"
        style={{
          border: "1px solid rgba(15,23,42,0.10)",
          color: "#0A0A0A",
        }}
      >
        {busy ? "…" : "Test"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="p-1 rounded hover:bg-red-50 disabled:opacity-50"
        style={{ color: "#B91C1C" }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: LlmProvider }) {
  const map: Record<LlmProvider, { emoji: string; color: string }> = {
    anthropic: { emoji: "🟣", color: "#7E22CE" },
    openai: { emoji: "⚫", color: "#0A0A0A" },
    deepseek: { emoji: "🔵", color: "#1E3A8A" },
    commonstack: { emoji: "🟢", color: "#15803D" },
  };
  const v = map[provider];
  return (
    <span
      className="font-mono uppercase tracking-[0.10em] rounded px-1.5 py-0.5 inline-flex items-center gap-1"
      style={{ fontSize: 8.5, color: v.color, background: "rgba(15,23,42,0.04)" }}
    >
      <span style={{ fontSize: 9 }}>{v.emoji}</span>
      {provider}
    </span>
  );
}

function TestStatusBadge({ status }: { status: ProviderKeyTestStatus | null }) {
  if (!status) return <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">untested</span>;
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono" style={{ color: "#15803D" }}>
        <CheckCircle2 className="w-3 h-3" /> ok
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono" style={{ color: "#B91C1C" }}>
      <AlertCircle className="w-3 h-3" /> {status}
    </span>
  );
}

function AddKeyForm({
  ownerWallet,
  onCancel,
  onAdded,
  onError,
}: {
  ownerWallet: string | null;
  onCancel: () => void;
  onAdded: () => void;
  onError: (msg: string | null) => void;
}) {
  const [provider, setProvider] = useState<LlmProvider>("anthropic");
  const [label, setLabel] = useState<string>("personal");
  const [key, setKey] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!ownerWallet) return;
    if (key.length < 8) {
      onError("Key must be at least 8 characters");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const r = await fetch(`/api/keys/providers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ provider, label, key }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error ?? `save failed (${r.status})`);
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="font-mono uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "#9CA3AF" }}>
            Provider
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as LlmProvider)}
            className="px-2 py-1.5 rounded text-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.10)" }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="commonstack">Commonstack</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-mono uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "#9CA3AF" }}>
            Label
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={64}
            className="px-2 py-1.5 rounded text-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.10)" }}
          />
        </label>
      </div>
      <label className="flex flex-col gap-0.5">
        <span className="font-mono uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "#9CA3AF" }}>
          API key
        </span>
        <textarea
          value={key}
          onChange={(e) => setKey(e.target.value)}
          rows={2}
          placeholder="sk-…"
          className="px-2 py-1.5 rounded text-[11.5px] font-mono"
          style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.10)" }}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium hover:bg-slate-50"
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy || key.length < 8}
          className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
          style={{
            background: "#22C55E",
            color: "#FFFFFF",
          }}
        >
          {busy ? "Saving…" : "Save key"}
        </button>
      </div>
    </div>
  );
}
