"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Shield, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

const BADGE_STYLES = [
  { id: "light", label: "Light", bg: "#ffffff", text: "#111827", border: "#e5e7eb" },
  { id: "dark", label: "Dark", bg: "#09090b", text: "#ffffff", border: "#27272a" },
  { id: "pulse", label: "Pulse", bg: "#3b82f6", text: "#ffffff", border: "#2563eb" },
];

export default function BadgesPage() {
  const { wallet } = useAuth();
  const [style, setStyle] = useState("light");
  const [showStats, setShowStats] = useState(true);
  const [copied, setCopied] = useState(false);

  const profileUrl = wallet ? `https://kyvernlabs.com/provider/${wallet}` : "https://kyvernlabs.com";
  const selectedStyle = BADGE_STYLES.find((s) => s.id === style) || BADGE_STYLES[0];

  const embedCode = `<!-- Verified by KyvernLabs Pulse -->
<a href="${profileUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:${selectedStyle.bg};color:${selectedStyle.text};border:1px solid ${selectedStyle.border};font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:500;text-decoration:none;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  Verified by Pulse${showStats ? " &middot; x402" : ""}
</a>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <h1 className="text-[18px] font-bold tracking-tight">Verified Badge</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Embed a trust badge on your x402 service page. Links to your public Pulse profile.
        </p>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-8 text-center shadow-premium"
      >
        <p className="text-[11px] text-quaternary mb-4 uppercase tracking-wider font-medium">Preview</p>
        <div className="flex justify-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: selectedStyle.bg,
              color: selectedStyle.text,
              border: `1px solid ${selectedStyle.border}`,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            Verified by Pulse{showStats ? " · x402" : ""}
          </a>
        </div>
      </motion.div>

      {/* Customization */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium space-y-4"
      >
        <h3 className="text-[14px] font-semibold">Customize</h3>

        <div>
          <label className="block text-[12px] text-tertiary font-medium mb-2">Style</label>
          <div className="flex gap-2">
            {BADGE_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                  style === s.id ? "border-pulse bg-pulse-50 text-pulse-600" : "border-black/[0.06] text-secondary hover:bg-[#FAFAFA]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[12px] text-tertiary font-medium">Show x402 tag</label>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`w-9 h-5 rounded-full transition-colors ${showStats ? "bg-pulse" : "bg-gray-200"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showStats ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </motion.div>

      {/* Embed code */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold">Embed Code</h3>
          <button
            onClick={copyEmbed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
          >
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy HTML</>}
          </button>
        </div>
        <pre className="bg-[#09090B] text-gray-100 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed">
          <code>{embedCode}</code>
        </pre>
        <p className="text-[11px] text-quaternary">
          Paste this HTML anywhere on your website. The badge links to your{" "}
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-pulse hover:underline inline-flex items-center gap-0.5">
            public profile <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </motion.div>
    </div>
  );
}
