"use client";

/* ════════════════════════════════════════════════════════════════════
   /docs — developer landing + integration guide.

   Three-pane feel: sticky sidebar on the left, prose + code on the
   right. No third-party docs framework — pure React/Tailwind to match
   the cinematic light theme of the landing and dashboard.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: "install", label: "Install" },
  { id: "quickstart", label: "Quickstart" },
  { id: "pay", label: "vault.pay()" },
  { id: "status", label: "vault.status()" },
  { id: "pause", label: "Kill switch" },
  { id: "errors", label: "Errors & decisions" },
  { id: "api", label: "REST API" },
  { id: "next", label: "What's next" },
];

export default function DocsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <TopBar />

      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-6 pb-24 pt-12 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              On this page
            </p>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={
                    "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors " +
                    (active === s.id
                      ? "bg-[#F5F5F7] font-medium text-black"
                      : "text-[#6E6E73] hover:text-black")
                  }
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <Hero />
          <Install />
          <Quickstart />
          <PayRef />
          <StatusRef />
          <PauseRef />
          <ErrorsRef />
          <ApiRef />
          <Next />
        </main>
      </div>
    </div>
  );
}

/* ─── Header ─── */

function TopBar() {
  return (
    <div className="sticky top-0 z-30 border-b border-[#F0F0F0] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6E6E73] transition-colors hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> KyvernLabs
        </Link>
        <div className="flex items-center gap-3 text-[12px] text-[#6E6E73]">
          <Link href="/vault/new" className="hover:text-black">
            Create a vault
          </Link>
          <span className="text-[#E5E5EA]">·</span>
          <a
            href="https://github.com/shariqazeem/kyvernlabs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-black"
          >
            GitHub <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mb-16"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6E6E73]">
        <Terminal className="h-3 w-3" /> Developer docs
      </div>
      <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-tight">
        Ship an agent with a budget
        <br />
        in three lines.
      </h1>
      <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-[#6E6E73]">
        @kyvernlabs/sdk is the official client for KyvernLabs vaults. It talks
        to the same API that powers the dashboard &mdash; install, paste, ship.
      </p>
    </motion.div>
  );
}

/* ─── Sections ─── */

function Install() {
  return (
    <Section id="install" title="Install" eyebrow="Setup">
      <CodeBlock
        language="bash"
        code={`npm install @kyvernlabs/sdk
# or
pnpm add @kyvernlabs/sdk
# or
yarn add @kyvernlabs/sdk`}
      />
      <p className="mt-4 text-[14px] text-[#6E6E73]">
        Node 18+ or any runtime with a global <code>fetch</code>. The package
        has zero runtime dependencies.
      </p>
    </Section>
  );
}

function Quickstart() {
  return (
    <Section id="quickstart" title="Quickstart" eyebrow="0 → first payment">
      <Steps>
        <Step n={1} title="Create a vault">
          Head to{" "}
          <Link href="/vault/new" className="text-[#3B82F6] hover:underline">
            /vault/new
          </Link>{" "}
          and walk through the 5-step onboarding. You&apos;ll receive a one-time{" "}
          <code>kv_live_…</code> agent key — copy it somewhere safe.
        </Step>
        <Step n={2} title="Set the env var">
          <CodeBlock
            language="bash"
            code={`export KYVERNLABS_AGENT_KEY=kv_live_...
export VAULT_ID=vlt_...`}
          />
        </Step>
        <Step n={3} title="Pay a merchant">
          <CodeBlock
            language="ts"
            code={`import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({
  agentKey: process.env.KYVERNLABS_AGENT_KEY!,
});

const res = await vault.pay({
  merchant: "api.openai.com",
  recipientPubkey: "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6",
  amount: 0.12,
  memo: "forecast lookup",
});

if (res.decision === "blocked") {
  console.log("refused:", res.code, res.reason);
} else {
  console.log("settled:", res.tx.signature);
}`}
          />
        </Step>
      </Steps>
    </Section>
  );
}

function PayRef() {
  return (
    <Section id="pay" title="vault.pay()" eyebrow="Method">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        Ask the vault to pay a merchant. Policy is enforced server-side — every
        call is budgeted, rate-limited, and matched against the allowlist
        before Squads co-signs.
      </p>
      <CodeBlock
        language="ts"
        code={`await vault.pay({
  merchant: string,          // URL or host, normalized server-side
  recipientPubkey: string,   // Solana pubkey of the USDC recipient
  amount: number,            // USD (USDC mint, 6 decimals)
  memo?: string,             // required if vault.requireMemo === true
}): Promise<PayResult>`}
      />
      <p className="mt-6 text-[13px] text-[#6E6E73]">
        Returns <code>{`{ decision: "allowed" | "blocked", … }`}</code>. Pass{" "}
        <code>throwOnBlocked: true</code> to the constructor if you&apos;d rather
        catch <code>KyvernPaymentBlocked</code>.
      </p>
    </Section>
  );
}

function StatusRef() {
  return (
    <Section id="status" title="vault.status()" eyebrow="Method">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        Snapshot of the vault — budget utilization, velocity, and the most
        recent payments. This is what the owner dashboard uses on every poll.
      </p>
      <CodeBlock
        language="ts"
        code={`const s = await vault.status({ vaultId: "vlt_abc", limit: 20 });

console.log(\`\${s.budget.spentToday} / \${s.budget.dailyLimitUsd} USD today\`);
console.log(\`\${s.velocity.callsInWindow} calls in last \${s.velocity.velocityWindow}\`);
for (const p of s.payments) {
  console.log(p.createdAt, p.merchant, p.amountUsd, p.status, p.reason ?? "");
}`}
      />
    </Section>
  );
}

function PauseRef() {
  return (
    <Section id="pause" title="Kill switch" eyebrow="Emergency stop">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        Pause blocks every future payment instantly. Existing policies stay
        intact — resume any time. Pause/resume require the <code>ownerWallet</code>{" "}
        at construction time.
      </p>
      <CodeBlock
        language="ts"
        code={`const owner = new Vault({
  agentKey: process.env.KYVERNLABS_AGENT_KEY!,
  ownerWallet: "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6",
});

await owner.pause({ vaultId: "vlt_abc" });   // agent is dead to the world
await owner.resume({ vaultId: "vlt_abc" });  // back online`}
      />
    </Section>
  );
}

function ErrorsRef() {
  return (
    <Section id="errors" title="Errors & decisions" eyebrow="Reference">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        Every <code>pay()</code> resolves with a decision. Blocks are{" "}
        <strong>not exceptions</strong> by default — they&apos;re data. The code is
        stable across versions so you can branch on it.
      </p>

      <div
        className="overflow-hidden rounded-[18px] border border-[#F0F0F0] bg-white"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}
      >
        <table className="w-full text-left">
          <thead className="bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0] text-[13px]">
            {BLOCK_CODES.map((b) => (
              <tr key={b.code}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px]">
                  {b.code}
                </td>
                <td className="px-4 py-3 text-[#6E6E73]">{b.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[13px] text-[#6E6E73]">
        Auth failures throw <code>KyvernAuthError</code> (401). Network or 5xx
        errors throw <code>KyvernError</code> with the HTTP status attached.
      </p>
    </Section>
  );
}

const BLOCK_CODES = [
  { code: "vault_paused", when: "Owner hit the kill switch." },
  {
    code: "amount_exceeds_per_tx",
    when: "A single payment exceeds the per-transaction ceiling.",
  },
  {
    code: "amount_exceeds_daily",
    when: "Today's spend plus this payment exceeds the 24h budget.",
  },
  {
    code: "amount_exceeds_weekly",
    when: "This week's spend plus this payment exceeds the 7d ceiling.",
  },
  {
    code: "merchant_not_allowed",
    when: "Merchant isn't in the vault's allowlist.",
  },
  { code: "velocity_cap", when: "Too many calls inside the velocity window." },
  {
    code: "missing_memo",
    when: "Vault requires a memo and the payment didn't include one.",
  },
  { code: "invalid_amount", when: "Non-positive or non-finite amount." },
  {
    code: "invalid_merchant",
    when: "Merchant string couldn't be parsed as a host or URL.",
  },
];

function ApiRef() {
  return (
    <Section id="api" title="REST API" eyebrow="Prefer curl?">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        The SDK is a thin client. Here&apos;s the raw API for polyglot teams.
      </p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://kyvernlabs.com/api/vault/pay \\
  -H "Authorization: Bearer kv_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant": "api.openai.com",
    "recipientPubkey": "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6",
    "amountUsd": 0.12,
    "memo": "forecast lookup"
  }'`}
      />
      <p className="mt-4 text-[12px] text-[#8E8E93]">
        200 = settled · 402 = policy block · 401 = bad key · 400 = validation · 502 = Squads failure
      </p>
    </Section>
  );
}

function Next() {
  return (
    <Section id="next" title="What's next" eyebrow="Keep building">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NextCard
          icon={<Zap className="h-4 w-4" />}
          title="Spin up a vault"
          description="Pick budgets, allowed merchants, and deploy on devnet in under a minute."
          href="/vault/new"
        />
        <NextCard
          icon={<Shield className="h-4 w-4" />}
          title="Squads Protocol v4"
          description="Every vault is a Squads smart account. $10B+ secured, audited three times."
          href="https://squads.so"
          external
        />
      </div>
    </Section>
  );
}

/* ─── Primitives ─── */

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[#F0F0F0] py-12 first-of-type:border-t-0 first-of-type:pt-0">
      {eyebrow && (
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
          {eyebrow}
        </div>
      )}
      <h2 className="mb-6 text-[28px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-4">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5EA] bg-white text-[12px] font-semibold text-[#6E6E73]"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {n}
      </div>
      <div>
        <h4 className="mb-2 text-[15px] font-semibold tracking-tight">
          {title}
        </h4>
        <div className="text-[14px] leading-relaxed text-[#6E6E73] [&_code]:rounded [&_code]:bg-[#F5F5F7] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-[#1c1c1e]">
          {children}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  language,
  code,
}: {
  language: "bash" | "ts" | "json";
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.split("\n"), [code]);
  return (
    <div
      className="group relative overflow-hidden rounded-[16px] border border-[#1c1c1e]/5 bg-[#0A0A0A] text-[#F5F5F7]"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
          {language}
        </span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-[#E5E5EA] transition-colors hover:bg-white/10"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-[#22C55E]" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.65]">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[32px_1fr]">
            <span className="select-none text-[#48484A]">
              {String(i + 1).padStart(2, " ")}
            </span>
            <code className="whitespace-pre">{line || " "}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

function NextCard({
  icon,
  title,
  description,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const inner = (
    <div
      className="group rounded-[20px] border border-[#F0F0F0] bg-white p-5 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F7] text-[#1c1c1e]">
        {icon}
      </div>
      <h4 className="mb-1 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
        {title}
        <ArrowUpRight className="h-3.5 w-3.5 text-[#8E8E93] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </h4>
      <p className="text-[13px] text-[#6E6E73]">{description}</p>
    </div>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}
