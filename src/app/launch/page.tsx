"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ArrowLeft, Check, Copy,
  Rocket,
} from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

type Step = 1 | 2 | 3 | 4;

/* ── Step indicator ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300"
            style={{
              background: i + 1 <= current ? "var(--text-primary)" : "var(--surface-2)",
              color: i + 1 <= current ? "white" : "var(--text-quaternary)",
            }}
          >
            {i + 1 < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className="w-12 h-0.5 transition-all duration-300"
              style={{ background: i + 1 < current ? "var(--text-primary)" : "var(--border)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: API Details ── */
function StepDetails({
  data,
  onChange,
}: {
  data: { name: string; url: string; description: string };
  onChange: (d: typeof data) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">Your API details</h2>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">Tell us about the endpoint you want to monetize.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-[13px] font-medium mb-1.5 block">API Name</label>
          <input
            type="text"
            placeholder="e.g. Weather Oracle"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="w-full h-12 px-4 text-[15px] card focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            style={{ borderRadius: "var(--radius-sm)", caretColor: "var(--accent)" }}
          />
        </div>
        <div>
          <label className="text-[13px] font-medium mb-1.5 block">Endpoint URL</label>
          <input
            type="url"
            placeholder="https://your-api.com/v1/data"
            value={data.url}
            onChange={(e) => onChange({ ...data, url: e.target.value })}
            className="w-full h-12 px-4 text-[15px] font-mono card focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            style={{ borderRadius: "var(--radius-sm)", caretColor: "var(--accent)" }}
          />
        </div>
        <div>
          <label className="text-[13px] font-medium mb-1.5 block">Description</label>
          <input
            type="text"
            placeholder="What does your API do?"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            className="w-full h-12 px-4 text-[15px] card focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            style={{ borderRadius: "var(--radius-sm)", caretColor: "var(--accent)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Pricing ── */
function StepPricing({
  price,
  onChange,
}: {
  price: string;
  onChange: (p: string) => void;
}) {
  const presets = ["$0.001", "$0.01", "$0.05", "$0.10", "$0.25", "$1.00"];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">Set your price</h2>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">How much per API call? Paid in USDC on Solana.</p>
      </div>
      <div>
        <label className="text-[13px] font-medium mb-1.5 block">Price per call (USD)</label>
        <input
          type="text"
          placeholder="0.01"
          value={price}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-14 px-4 text-[24px] font-bold font-mono-numbers card focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          style={{ borderRadius: "var(--radius-sm)", caretColor: "var(--accent)" }}
        />
      </div>
      <div>
        <p className="text-[12px] text-[var(--text-quaternary)] mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p.replace("$", ""))}
              className="px-4 py-2 text-[13px] font-mono-numbers font-medium transition-all duration-200 btn-press"
              style={{
                borderRadius: "var(--radius-sm)",
                background: `$${price}` === p ? "var(--text-primary)" : "var(--surface-2)",
                color: `$${price}` === p ? "white" : "var(--text-secondary)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="card p-4 mt-4">
        <p className="text-[12px] text-[var(--text-tertiary)]">
          At <span className="font-mono-numbers font-semibold text-[var(--text-primary)]">${price || "0.01"}</span> per call with 1,000 daily calls, you&apos;d earn{" "}
          <span className="font-mono-numbers font-semibold text-[var(--text-primary)]">
            ${((parseFloat(price || "0.01") * 1000 * 30) || 0).toFixed(0)}/month
          </span>
        </p>
      </div>
    </div>
  );
}

/* ── Step 3: Integration Code ── */
function StepIntegration({ price }: { apiName: string; price: string }) {
  const [copied, setCopied] = useState(false);
  const code = `import { withPulse } from '@kyvernlabs/pulse'
import { withX402 } from '@x402/next'

const x402Config = {
  price: ${price || "0.01"},
  network: 'solana:mainnet',
  asset: 'USDC-SPL',
}

export const GET = withPulse(
  withX402(handler, x402Config, server),
  { apiKey: 'kv_live_...' }  // auto-filled from dashboard
)`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">Add one line to your code</h2>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">Copy this into your API route. That&apos;s the entire integration.</p>
      </div>
      <div
        className="bg-[#09090B] overflow-hidden relative"
        style={{ borderRadius: "var(--radius-lg)", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <span className="ml-3 text-[10px] text-white/15 font-mono">route.ts</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/40 hover:text-white/70 transition-all"
          >
            {copied ? <Check className="w-3 h-3" style={{ color: "#22c55e" }} /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-5 text-[13px] font-mono leading-[1.8] overflow-x-auto text-gray-300">
          {code}
        </pre>
      </div>
      <p className="text-[12px] text-[var(--text-quaternary)]">
        Run <code className="font-mono" style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: "4px" }}>npm install @kyvernlabs/pulse @x402/next</code> first.
      </p>
    </div>
  );
}

/* ── Step 4: Done ── */
function StepDone({ apiName }: { apiName: string }) {
  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ background: "var(--success-bg)" }}
      >
        <Rocket className="w-7 h-7" style={{ color: "var(--success)" }} />
      </motion.div>
      <div>
        <h2 className="text-[24px] font-bold tracking-tight">
          {apiName || "Your API"} is ready
        </h2>
        <p className="text-[15px] text-[var(--text-tertiary)] mt-2 max-w-sm mx-auto">
          Deploy your code and payments will appear in your Pulse dashboard in real-time.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
        <Link href="/pulse/dashboard" className="btn-primary">
          Open Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/pulse/dashboard/setup" className="btn-secondary">
          Full Setup Guide
        </Link>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function LaunchPage() {
  const [step, setStep] = useState<Step>(1);
  const [details, setDetails] = useState({ name: "", url: "", description: "" });
  const [price, setPrice] = useState("0.01");

  const canProceed = step === 1
    ? details.name.length > 0
    : step === 2
    ? parseFloat(price) > 0
    : true;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/og-image.jpg" alt="KyvernLabs" width={24} height={24} className="rounded-lg" />
          <span className="text-[14px] font-semibold tracking-tight">KyvernLabs</span>
        </Link>
        <Link href="/" className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          Back to home
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex justify-center mb-12">
            <StepIndicator current={step} total={4} />
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease }}
            >
              {step === 1 && <StepDetails data={details} onChange={setDetails} />}
              {step === 2 && <StepPricing price={price} onChange={setPrice} />}
              {step === 3 && <StepIntegration apiName={details.name} price={price} />}
              {step === 4 && <StepDone apiName={details.name} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-10">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="btn-ghost"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canProceed}
                className="btn-primary"
              >
                {step === 3 ? "Launch" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
