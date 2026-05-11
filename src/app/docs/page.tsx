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
  { id: "check-allowance", label: "vault.checkAllowance()" },
  { id: "status", label: "vault.status()" },
  { id: "pause", label: "Kill switch" },
  { id: "errors", label: "Errors & decisions" },
  { id: "paysh", label: "Wrap pay.sh" },
  { id: "kast", label: "Pay out to KAST" },
  { id: "api", label: "REST API" },
  { id: "honesty", label: "What this isn't" },
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
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
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
          <CheckAllowanceRef />
          <StatusRef />
          <PauseRef />
          <ErrorsRef />
          <PayShWrap />
          <KastPayout />
          <ApiRef />
          <Honesty />
          <Next />
        </main>
      </div>
    </div>
  );
}

/* ─── Header ─── */

function TopBar() {
  return (
    <div
      className="sticky top-0 z-30"
      style={{
        background: "rgba(250,250,250,0.82)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6E6E73] transition-colors hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> Kyvern
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
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#6E6E73]"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <Terminal className="h-3 w-3" /> Developer docs
      </div>
      <h1
        className="mt-5 font-semibold leading-[1.04] tracking-tight"
        style={{
          fontSize: 48,
          letterSpacing: "-0.025em",
          color: "#0A0A0A",
        }}
      >
        Ship an agent with a budget,
        <br />
        in three lines.
      </h1>
      <p
        className="mt-5 max-w-[560px] leading-relaxed"
        style={{ fontSize: 15, color: "#475569" }}
      >
        @kyvernlabs/sdk is the official client for Kyvern vaults. It talks to
        the same API that powers the /app dashboard. Install, paste, ship.
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
        <Step n={1} title="Mint an agent key">
          Sign in at{" "}
          <Link href="/app" className="text-[#3B82F6] hover:underline">
            /app
          </Link>{" "}
          → <em>Agent keys</em> → <em>Mint a key</em>. The{" "}
          <code>kv_live_…</code> key is shown once — paste it into your env.
        </Step>
        <Step n={2} title="Set the env vars">
          <CodeBlock
            language="bash"
            code={`export KYVERN_AGENT_KEY=kv_live_...
# optional: route earnings to a KAST-funded card
export MY_KAST_ADDRESS=...`}
          />
        </Step>
        <Step n={3} title="Pay (5 lines)">
          <CodeBlock
            language="ts"
            code={`import { Vault, KastDestination } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
const res = await vault.pay({ ...myKast, amount: 1.50, memo: "weekly yield share" });
if (res.decision !== "allowed") throw new Error(res.reason);`}
          />
          <p className="mt-3 text-[13px] text-[#6E6E73]">
            That&apos;s a real on-chain USDC transfer to the user&apos;s KAST
            deposit address — five lines, decided by the chain. The same
            policy that runs here also runs on every spend the agent makes.
          </p>
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

/* ─── Wrap pay.sh ─── */

function PayShWrap() {
  return (
    <Section id="paysh" title="Wrap pay.sh with Kyvern in 4 lines" eyebrow="Headline guide">
      <p className="mb-4 text-[14px] leading-relaxed text-[#6E6E73]">
        <a
          href="https://pay.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B82F6] hover:underline"
        >
          pay.sh
        </a>{" "}
        is the Solana Foundation&apos;s payment layer for HTTP agents. It
        handles 402/x402/MPP challenges and asks the local wallet to sign.
        Their docs say <em>&ldquo;Real payments still require local user
        authorization.&rdquo;</em> Kyvern is what closes that gap — the
        chain takes the place of the wallet approval prompt so an agent
        can run autonomously without compromising safety.
      </p>
      <CodeBlock
        language="bash"
        code={`# 1. Install both tools.
brew install pay                 # macOS
# or
npm install -g @solana/pay       # Linux/Windows
npm install @kyvernlabs/sdk

# 2. Scaffold a Kyvern-protected agent that pays pay.sh APIs.
npx create-kyvern-agent my-agent

# 3. The scaffolded agent calls pay.sh through your Kyvern vault.
#    Every call passes through your on-chain policy. Drains, rogue
#    endpoints, over-cap purchases — all refused before pay.sh sees them.
cd my-agent && npm start`}
      />
      <p className="mt-4 mb-2 text-[14px] font-semibold">The architectural moment</p>
      <p className="mb-3 text-[14px] leading-relaxed text-[#6E6E73]">
        Before invoking pay.sh, ask the vault first:
      </p>
      <CodeBlock
        language="ts"
        code={`const allowance = await vault.checkAllowance({
  merchant: "api.pay.sh",
  amount: 0.001,
});
if (allowance.decision !== "allowed") {
  // Kyvern refused — pay.sh is never invoked, no wallet prompt fires.
  return console.warn("blocked:", allowance.reason);
}

// Kyvern allowed — pay.sh executes the 402-paywalled call.
const result = execSync(
  \`pay --sandbox curl https://pay.sh/<service-url>\`,
  { encoding: "utf-8" },
);`}
      />
      <p className="mt-4 text-[13px] text-[#8E8E93]">
        Kyvern is <em>compatible with pay.sh and any HTTP-402 payment
        rail.</em> Not partnered with pay.sh. The composability is the
        integration.
      </p>
    </Section>
  );
}

/* ─── KAST payout ─── */

function KastPayout() {
  return (
    <Section
      id="kast"
      title="Sending earnings to a KAST-funded card"
      eyebrow="Real-world payoff loop"
    >
      <p className="mb-4 text-[14px] leading-relaxed text-[#6E6E73]">
        Every KAST user has a Solana USDC deposit address. Send USDC there
        → it tops up their card → they spend at 150M+ merchants worldwide.
        Kyvern wraps that flow in a vault budget so an agent can route a
        share of accrued earnings to your card automatically.
      </p>
      <Steps>
        <Step n={1} title="Find your address">
          Open the KAST app → <em>Deposit</em> → <em>Solana USDC</em>. Copy
          the address.
        </Step>
        <Step n={2} title="Allowlist as MY_KAST">
          In Kyvern{" "}
          <Link href="/app" className="text-[#3B82F6] hover:underline">
            /app
          </Link>
          , paste it under <em>MY_KAST setup</em>. Click{" "}
          <em>Allowlist as MY_KAST</em>. (This adds <code>kast.xyz</code>{" "}
          to your vault&apos;s allowlist + persists the address.)
        </Step>
        <Step n={3} title="Spend in five lines">
          <CodeBlock
            language="ts"
            code={`import { Vault, KastDestination } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
const res = await vault.pay({ ...myKast, amount: 1.50, memo: "weekly yield share" });
if (res.decision !== "allowed") throw new Error(res.reason);`}
          />
        </Step>
      </Steps>
      <p className="mt-5 text-[14px] text-[#6E6E73]">
        Don&apos;t have a KAST card?{" "}
        <a
          href="https://go.kast.xyz/VqVO/STPAK"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B82F6] hover:underline"
        >
          Get one →
        </a>
      </p>
      <p className="mt-3 text-[13px] text-[#8E8E93]">
        Kyvern is <em>compatible with KAST deposit rails</em>. Not
        affiliated with KAST. We don&apos;t verify the address belongs to
        a KAST account — the user owns the address either way.
      </p>
    </Section>
  );
}

/* ─── checkAllowance reference ─── */

function CheckAllowanceRef() {
  return (
    <Section id="check-allowance" title="vault.checkAllowance()" eyebrow="Method">
      <p className="mb-4 text-[14px] text-[#6E6E73]">
        Run the same off-chain policy check that <code>pay()</code> runs,
        but without making a payment. Returns the chain&apos;s verdict
        ahead of time so an agent can decide whether to fire the
        underlying paid call.
      </p>
      <CodeBlock
        language="ts"
        code={`await vault.checkAllowance({
  merchant: string,         // URL or host, normalized server-side
  amount: number,           // USD
  memo?: string,            // required if vault.requireMemo === true
}): Promise<{ decision: "allowed" | "blocked", reason?: string, code?: string }>`}
      />
      <p className="mt-4 text-[13px] text-[#6E6E73]">
        Use this when you&apos;re wrapping pay.sh, x402, or any 402-paywalled
        rail — the vault decides BEFORE the rail&apos;s wallet prompt fires.
      </p>
    </Section>
  );
}

/* ─── Honesty section ─── */

function Honesty() {
  return (
    <Section id="honesty" title="What this is, and what this isn't" eyebrow="Honesty">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          className="rounded-[12px] border p-5"
          style={{ borderColor: "rgba(34,197,94,0.20)", background: "rgba(34,197,94,0.04)" }}
        >
          <h3 className="mb-2 text-[14px] font-semibold tracking-tight">
            What this is
          </h3>
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-[#374151]">
            <li>
              Financial safety infrastructure for autonomous agents on
              Solana — a smart safe, an on-chain policy program, an SDK,
              and a scaffolder.
            </li>
            <li>
              An on-chain policy program at{" "}
              <code className="text-[12px]">PpmZ…MSqc</code> deployed to
              devnet, enforcing per-tx caps, daily/weekly caps,
              merchant allowlists, memo requirements, velocity caps, and
              a kill switch.
            </li>
            <li>
              Atlas, our reference agent, has been running on Solana
              devnet continuously since April 20, 2026 — every block and
              every settle is a real on-chain transaction you can verify
              on Explorer.
            </li>
          </ul>
        </div>
        <div
          className="rounded-[12px] border p-5"
          style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(245,158,11,0.04)" }}
        >
          <h3 className="mb-2 text-[14px] font-semibold tracking-tight">
            What this isn&apos;t
          </h3>
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-[#374151]">
            <li>
              A hardware device, an AI experience, a fully autonomous
              trading bot, mainnet-deployed, or a financial advisor.
              Mainnet audit in progress.
            </li>
            <li>
              A KAST partner. We route on-chain to a public Solana USDC
              deposit address that any KAST user owns. The integration
              speaks via the working flow + the affiliate link.
            </li>
            <li>
              A pay.sh partner or wrapper SDK. Kyvern is the policy
              layer above the rails — pay.sh executes the paid HTTP
              call; Kyvern decides which calls the agent is allowed to
              make. Both products&apos; value compounds.
            </li>
            <li>
              Atlas&apos;s decisions are scripted by design. The moat is
              the financial control layer, not the intelligence — even a
              deliberately minimal agent demonstrates the thesis. LLM-
              driven Atlas is post-Frontier.
            </li>
          </ul>
        </div>
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
        <div className="text-[14px] leading-relaxed text-[#6E6E73] [&_p_code]:rounded [&_p_code]:bg-[#F5F5F7] [&_p_code]:px-1 [&_p_code]:py-0.5 [&_p_code]:font-mono [&_p_code]:text-[12px] [&_p_code]:text-[#1c1c1e]">
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
      className="group relative overflow-hidden rounded-[14px] bg-[#0A0A0A] text-[#F5F5F7]"
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px -12px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* macOS-style title bar with traffic-light dots */}
      <div
        className="flex items-center px-3 py-2.5 select-none"
        style={{
          background:
            "linear-gradient(180deg, #1F1F22 0%, #141416 100%)",
          borderBottom: "1px solid rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: "#FF5F57",
              border: "0.5px solid rgba(0,0,0,0.20)",
            }}
          />
          <span
            aria-hidden
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: "#FEBC2E",
              border: "0.5px solid rgba(0,0,0,0.20)",
            }}
          />
          <span
            aria-hidden
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: "#28C840",
              border: "0.5px solid rgba(0,0,0,0.20)",
            }}
          />
        </div>
        <span
          className="font-mono mx-auto"
          style={{
            fontSize: 10.5,
            color: "rgba(229,231,235,0.55)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {language}
        </span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="inline-flex items-center gap-1.5 rounded-md transition-colors"
          style={{
            padding: "3px 8px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            fontSize: 10.5,
            color: "rgba(229,231,235,0.75)",
          }}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3 w-3" style={{ color: "#34D399" }} />{" "}
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.65] !bg-transparent">
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[32px_1fr]">
            <span className="select-none text-[#48484A]">
              {String(i + 1).padStart(2, " ")}
            </span>
            <code className="whitespace-pre !bg-transparent !p-0 !text-inherit !rounded-none">
              {line || " "}
            </code>
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
