"use client";

/**
 * ApiKeyPill — persistent click-to-copy agent key affordance for the
 * IdentityStrip. Replaces the buried "Mint a key" Step-1 + the
 * one-shot "shown once at deploy" pattern that was costing demos
 * (visitors who didn't copy the key at /vault/new couldn't recover it
 * later — Helius-style top-nav copy is the right pattern).
 *
 * Behaviour:
 *
 *   · We can't recover the raw key from the hash on the server. So
 *     we cache the raw on the client at the moments we *do* have it:
 *     /vault/new deploy success + /try guest provision. Anytime
 *     localStorage has `kyvern:agent-key:${vaultId}`, the pill shows
 *     the full key and copies it on click.
 *
 *   · If localStorage doesn't have it (cleared, different browser,
 *     long-stale device), the pill renders as "Reveal" — clicking
 *     mints a fresh key via POST /api/devices/[id]/agent-key, caches
 *     the raw to localStorage, copies it to clipboard, then collapses
 *     to the normal show-and-copy state. Old keys remain valid
 *     because issueAgentKey() doesn't revoke siblings.
 *
 * Single point of truth: this component decides what's rendered. The
 * IdentityStrip just wires it in.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Key, Loader2 } from "lucide-react";

interface Props {
  deviceId: string | null;
}

const RAW_KEY_STORAGE = (vaultId: string) => `kyvern:agent-key:${vaultId}`;

export function ApiKeyPill({ deviceId }: Props) {
  const [prefix, setPrefix] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prefix from server + raw from localStorage on mount / deviceId
  // change. Stays cheap: one GET, never refires unless the device id
  // actually changes.
  useEffect(() => {
    if (!deviceId) {
      setPrefix(null);
      setRawKey(null);
      return;
    }
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(RAW_KEY_STORAGE(deviceId));
      if (cached && cached.startsWith("kv_live_")) {
        setRawKey(cached);
        setPrefix(cached.slice(0, 12)); // kv_live_XXXX
        return; // skip GET — local cache is authoritative
      }
    }
    let alive = true;
    fetch(`/api/devices/${deviceId}/agent-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { keyPrefix?: string } | null) => {
        if (!alive) return;
        if (d?.keyPrefix) setPrefix(d.keyPrefix);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [deviceId]);

  // Cleanup the copy timer on unmount so we don't try to setState on
  // a torn-down node.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const flashCopied = useCallback(() => {
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1400);
  }, []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        flashCopied();
      } catch {
        // Older browsers / strict permissions. Best-effort: select-on-prompt
        window.prompt("Copy your Kyvern agent key:", value);
        flashCopied();
      }
    },
    [flashCopied],
  );

  const mintFreshAndCopy = useCallback(async () => {
    if (!deviceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/agent-key`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        rawKey?: string;
        keyPrefix?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.rawKey) {
        throw new Error(data?.error ?? `mint failed (${res.status})`);
      }
      // Persist for future loads + show inline now.
      try {
        window.localStorage.setItem(RAW_KEY_STORAGE(deviceId), data.rawKey);
      } catch {
        /* private mode / quota — proceed anyway, UI still works for this session */
      }
      setRawKey(data.rawKey);
      setPrefix(data.keyPrefix ?? data.rawKey.slice(0, 12));
      await copy(data.rawKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mint failed");
    } finally {
      setBusy(false);
    }
  }, [deviceId, busy, copy]);

  const handleClick = useCallback(() => {
    if (busy || !deviceId) return;
    if (rawKey) {
      void copy(rawKey);
      return;
    }
    void mintFreshAndCopy();
  }, [busy, deviceId, rawKey, copy, mintFreshAndCopy]);

  if (!deviceId) return null;

  // Display label — what fits in the pill.
  // If we have the raw key cached → show prefix + ellipsis (compact).
  // If we don't and just clicked → loading.
  // If we don't yet → "API key" placeholder.
  const labelMain = rawKey
    ? `${rawKey.slice(0, 12)}…`
    : prefix
      ? `${prefix}…`
      : "API key";

  const tooltip = rawKey
    ? "Click to copy your Kyvern agent key"
    : prefix
      ? "Click to reveal + copy a fresh agent key (old keys stay valid)"
      : "Click to mint your first agent key";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !!error}
      title={tooltip}
      className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-[8px] transition-colors disabled:cursor-not-allowed"
      style={{
        background: copied ? "rgba(34,197,94,0.10)" : "rgba(15,23,42,0.04)",
        border: `1px solid ${
          copied ? "rgba(34,197,94,0.30)" : "rgba(15,23,42,0.08)"
        }`,
        color: copied ? "#16A34A" : "#0A0A0A",
      }}
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
      ) : copied ? (
        <Check className="w-3 h-3" strokeWidth={2.2} />
      ) : (
        <Key
          className="w-3 h-3"
          strokeWidth={2}
          style={{ color: copied ? "#16A34A" : "rgba(15,23,42,0.55)" }}
        />
      )}
      <span
        className="font-mono"
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}
      >
        {error ? "key mint failed" : copied ? "copied" : labelMain}
      </span>
      {!busy && !copied && !error && (
        <Copy
          className="w-3 h-3 opacity-60"
          strokeWidth={2}
        />
      )}
    </button>
  );
}
