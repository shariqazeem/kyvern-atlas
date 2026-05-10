"use client";

/**
 * WorkerTemplates — Deploy-a-Worker gallery beneath the Atlas hero.
 *
 * One real card (Clone Atlas → /vault/new) + four roadmap cards
 * (Research / Treasury / Growth / Governance) marked "Q3 2026."
 * Honest scaffolding: signals the category we're building toward
 * without pretending non-existent runtimes are live.
 *
 * Design: 5 minimal cards in a row on desktop (2-col on mobile).
 * Clone Atlas is visually loud (green register, "Live · 1-click"),
 * the rest are muted with a "Coming Q3 2026" pill.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Compass,
  Newspaper,
  BarChart3,
  TrendingUp,
  Vote,
  ArrowRight,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Tone = "active" | "roadmap";

interface Tpl {
  id: string;
  title: string;
  subtitle: string;
  Icon: typeof Compass;
  tone: Tone;
  href?: string;
  badge?: string;
}

const templates: Tpl[] = [
  {
    id: "provision-vault",
    title: "Provision Worker Vault",
    subtitle:
      "Chain-enforced wallet for your worker · build behavior with the SDK",
    Icon: Compass,
    tone: "active",
    href: "/vault/new",
    badge: "Live · 60s",
  },
  {
    id: "research",
    title: "Research",
    subtitle: "Monitors crypto / AI / governance · sells access via x402",
    Icon: Newspaper,
    tone: "roadmap",
    badge: "Hosted · Q3 2026",
  },
  {
    id: "treasury",
    title: "Treasury Analyst",
    subtitle: "Watches treasury risk · proposes actions under policy",
    Icon: BarChart3,
    tone: "roadmap",
    badge: "Hosted · Q3 2026",
  },
  {
    id: "growth",
    title: "Growth",
    subtitle: "Generates content + signals · pays for inference, monetizes feeds",
    Icon: TrendingUp,
    tone: "roadmap",
    badge: "Hosted · Q3 2026",
  },
  {
    id: "governance",
    title: "Governance Watcher",
    subtitle: "Tracks proposals · summarizes changes · sends premium alerts",
    Icon: Vote,
    tone: "roadmap",
    badge: "Hosted · Q3 2026",
  },
];

export function WorkerTemplates() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-3 px-1 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h3
            className="text-[15px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0A0A0A" }}
          >
            Build your worker
          </h3>
          <p
            className="text-[11.5px] leading-[1.4]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Provision the chain-enforced wallet today. Wire behavior via the
            SDK. Hosted autonomous workers ship Q3 2026.
          </p>
        </div>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
        >
          vault live · workers Q3
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {templates.map((t) => (
          <TemplateCard key={t.id} tpl={t} />
        ))}
      </div>
    </motion.section>
  );
}

function TemplateCard({ tpl }: { tpl: Tpl }) {
  const isActive = tpl.tone === "active";
  const inner = isActive ? (
    <motion.div
      className="relative h-full rounded-[14px] p-3.5 flex flex-col gap-2 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(34,197,94,0.04) 0%, #FFFFFF 100%)",
        border: "1px solid rgba(34,197,94,0.30)",
      }}
      animate={{
        boxShadow: [
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(34,197,94,0.20)",
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(34,197,94,0.40), 0 0 0 1px rgba(34,197,94,0.30)",
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(34,197,94,0.20)",
        ],
      }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <TemplateCardBody tpl={tpl} isActive />
    </motion.div>
  ) : (
    <div
      className="relative h-full rounded-[14px] p-3.5 flex flex-col gap-2 overflow-hidden transition-all"
      style={{
        background: "#FFFFFF",
        border: "1px dashed rgba(15,23,42,0.18)",
        opacity: 0.7,
      }}
    >
      <TemplateCardBody tpl={tpl} isActive={false} />
    </div>
  );
  if (isActive && tpl.href) {
    return (
      <Link
        href={tpl.href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] rounded-[14px]"
      >
        {inner}
      </Link>
    );
  }
  return <div aria-disabled className="cursor-not-allowed">{inner}</div>;
}

function TemplateCardBody({
  tpl,
  isActive,
}: {
  tpl: Tpl;
  isActive: boolean;
}) {
  return (
    <>
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={
          isActive
            ? {
                background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
                boxShadow: "0 0 0 1px rgba(34,197,94,0.20)",
              }
            : {
                background: "rgba(15,23,42,0.04)",
                border: "1px solid rgba(15,23,42,0.05)",
              }
        }
      >
        <tpl.Icon
          className="w-4 h-4"
          strokeWidth={2}
          style={{
            color: isActive ? "#FFFFFF" : "rgba(15,23,42,0.55)",
          }}
        />
      </div>

      {/* Title + subtitle */}
      <div className="flex flex-col gap-0.5 flex-1">
        <h4
          className="text-[13.5px] font-semibold tracking-[-0.005em]"
          style={{ color: "#0A0A0A" }}
        >
          {tpl.title}
        </h4>
        <p
          className="text-[11.5px] leading-[1.4]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          {tpl.subtitle}
        </p>
      </div>

      {/* Badge / CTA */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <span
          className="font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
          style={{
            fontSize: 8.5,
            color: isActive ? "#15803D" : "rgba(15,23,42,0.40)",
            background: isActive ? "rgba(34,197,94,0.10)" : "transparent",
            border: isActive
              ? "1px solid rgba(34,197,94,0.20)"
              : "1px dashed rgba(15,23,42,0.15)",
          }}
        >
          {tpl.badge ?? (isActive ? "Live" : "Soon")}
        </span>
        {isActive && (
          <ArrowRight
            className="w-3.5 h-3.5"
            style={{ color: "#15803D" }}
            strokeWidth={2.2}
          />
        )}
      </div>
    </>
  );
}
