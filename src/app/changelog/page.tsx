import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Changelog — KyvernLabs",
  description: "See what's new in KyvernLabs Pulse. Product updates, new features, and improvements.",
};

const CHANGELOG = [
  {
    date: "April 5, 2026",
    version: "v0.4.0",
    title: "Billion-Dollar Transformation",
    tag: "major",
    items: [
      "Command Palette (Cmd+K) for instant navigation and search",
      "AI Revenue Narrator — daily insights on your dashboard overview",
      "Agent Persona Engine — wallet addresses become characters (Whale, Researcher, Loyalist)",
      "Money Moments — social-media-style feed of significant revenue events",
      "Revenue Forecast — 7-day projection with confidence bands",
      "Revenue Simulator — interactive tool to project x402 earnings",
      "Public Changelog page",
    ],
  },
  {
    date: "April 5, 2026",
    version: "v0.3.0",
    title: "Advisory Feature Drop",
    tag: "major",
    items: [
      "Base mainnet switch — all chain IDs, USDC addresses, explorer URLs updated",
      "Public x402 Leaderboard on homepage — anonymous market data",
      "Real-time SSE updates — live dashboard without refreshing",
      "Slack/Discord alert notifications — get pinged on revenue events",
      "Intelligence ungated — free for all users to seed network effect",
      "Framework integration templates — Next.js, Express, Hono, Any Language",
      "A/B pricing experiments API",
      "Historical data import API (up to 10K events)",
      "Growth tier ($19/mo) — middle tier between Free and Pro",
      "Free tier limits raised — 5,000 events/day, $100 revenue, 14-day retention",
      "Credibility fixes — ecosystem logo disclaimers, LICENSE file",
    ],
  },
  {
    date: "April 4, 2026",
    version: "v0.2.0",
    title: "Production Ready",
    tag: "major",
    items: [
      "Privy integration — email, Google, and wallet login",
      "Multi-tenant data isolation — every user sees only their data",
      "Pro upgrade via one-click USDC payment on Base",
      "Webhooks with HMAC-SHA256 signing and delivery tracking",
      "Smart alerts — 5 types with configurable thresholds",
      "CSV export — transactions, endpoints, customers",
      "MCP server — 17 tools for AI agents to query analytics",
      "Dark mode — CSS-level overrides",
      "Security hardening — rate limiting, key hashing, session cookies",
    ],
  },
  {
    date: "April 2, 2026",
    version: "v0.1.0",
    title: "Launch",
    tag: "launch",
    items: [
      "Initial release of KyvernLabs Pulse",
      "withPulse() middleware for x402 endpoints",
      "Revenue dashboard with real-time stats",
      "Transactions, endpoints, customers pages",
      "On-chain verification badges with BaseScan links",
      "SIWE wallet-native authentication",
      "API key management with kv_live_ prefix",
      "Premium landing pages for KyvernLabs and Pulse",
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  major: "bg-pulse-50 text-pulse-600",
  feature: "bg-emerald-50 text-emerald-600",
  fix: "bg-amber-50 text-amber-600",
  launch: "bg-indigo-50 text-indigo-600",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] mb-2">
            Changelog
          </h1>
          <p className="text-[15px] text-secondary mb-12">
            New features, improvements, and fixes. We ship fast.
          </p>

          <div className="space-y-12">
            {CHANGELOG.map((entry) => (
              <article key={entry.version} className="relative pl-8 border-l-2 border-black/[0.06]">
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-pulse border-2 border-white" />
                <div className="flex items-center gap-3 mb-3">
                  <time className="text-[12px] text-quaternary font-mono">{entry.date}</time>
                  <span className="text-[10px] font-mono font-medium text-tertiary">{entry.version}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${TAG_STYLES[entry.tag] || TAG_STYLES.feature}`}>
                    {entry.tag}
                  </span>
                </div>
                <h2 className="text-[17px] font-semibold tracking-tight mb-3">{entry.title}</h2>
                <ul className="space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-[13px] text-secondary leading-relaxed flex items-start gap-2">
                      <span className="text-quaternary mt-1.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
