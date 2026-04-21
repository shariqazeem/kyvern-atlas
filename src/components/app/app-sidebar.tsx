"use client";

/* ════════════════════════════════════════════════════════════════════
   AppSidebar — ONE sidebar across the entire Kyvern app.

   The problem with the old layout: /vault and /pulse felt like two
   different products because their navigation was split. This component
   replaces that with a single, cross-product sidebar used by every
   authenticated page (/app/*).

   Copy choices:
     · "Home" — the unified overview
     · "Vaults" — pay side (agents spending on your behalf)
     · "Services" — earn side (services receiving from agents)
     · "Payments" — unified activity feed across both
     · "Keys" — API keys + agent keys in one place
     · "Copilot" — the AI assistant (Pulse asset, reused)
     · "Settings"
   ════════════════════════════════════════════════════════════════════ */

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Wallet,
  Globe,
  Activity,
  Key,
  Settings,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar groups.
 *
 * Deliberately short labels — no product brand names ("Vault" / "Pulse")
 * in the section headers. Kyvern is ONE product; "Spend" and "Earn" are
 * two simple verbs describing what the user does inside it, which is the
 * mental model we want every newcomer to inherit the first second they
 * see the app. The page titles (/app/vaults, /app/services) keep the
 * feature names as affordances — "vaults" still makes sense as "the
 * containers you manage" — but the section chrome stays clean.
 */
/**
 * Sidebar nav — single mental model ("I run agents"), three nouns:
 *   · Agents   — the things you deploy (was "Vaults" under a "Spend"
 *                section). Each agent is a Squads vault + Kyvern policy
 *                PDA + bound keypair, but users think of it as an agent.
 *   · Activity — the unified on-chain truth: every payment an agent
 *                attempted, allowed, or denied (was "Payments").
 *   · Revenue  — what comes back when your agents pay OTHER Kyvern
 *                services, or when Kyvern agents pay yours (was
 *                "Services" under "Earn"). Positioned as a consequence
 *                of running agents, not a sibling product.
 *
 * The old "Spend / Earn" grouping split the mental model in two. The
 * new flat list says "you run agents, and here's everything that
 * happens because of them."
 */
const NAV_GROUPS = [
  {
    label: "",
    items: [
      { href: "/app", label: "Home", icon: Home, matchExact: true },
      { href: "/app/vaults", label: "Agents", icon: Wallet },
      { href: "/app/payments", label: "Activity", icon: Activity },
      { href: "/app/services", label: "Revenue", icon: Globe },
    ],
  },
  {
    label: "Shared",
    items: [
      { href: "/app/keys", label: "API keys", icon: Key },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

type ExternalLinkItem = {
  href: string;
  label: string;
  icon: React.ComponentType<Record<string, unknown>>;
  external?: boolean;
};

const EXTERNAL: ExternalLinkItem[] = [
  { href: "/docs", label: "Documentation", icon: BookOpen },
  {
    href: "https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet",
    label: "Kyvern program",
    icon: ExternalLink,
    external: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className="w-[240px] shrink-0 h-[calc(100vh-56px)] sticky top-[56px] overflow-y-auto"
      style={{
        borderRight: "0.5px solid var(--border-subtle)",
        background: "var(--surface)",
      }}
    >
      <div className="p-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label || "top"}>
            {group.label && (
              <p
                className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                {group.label}
              </p>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const active = itemIsActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-3 h-9 rounded-[10px] text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-[var(--surface-2)]"
                        : "hover:bg-[var(--surface-2)]",
                    )}
                    style={{
                      color: active
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <item.icon
                      className="w-4 h-4 shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {/* badge slot reserved for future per-item tags */}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r"
                        style={{ background: "var(--text-primary)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        <div
          className="pt-5 mt-4 space-y-0.5"
          style={{ borderTop: "0.5px solid var(--border-subtle)" }}
        >
          {EXTERNAL.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-2.5 px-3 h-9 rounded-[10px] text-[13px] font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <link.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="flex-1 truncate">{link.label}</span>
            </a>
          ))}
        </div>

        {/* Honest-label strip — always visible in the sidebar so no one
            misreads the deploy state. */}
        <div
          className="mt-6 mx-1 px-3 py-3 rounded-[10px]"
          style={{
            background: "var(--surface-2)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-[10px] font-mono uppercase tracking-wider mb-1"
            style={{ color: "var(--warning)" }}
          >
            Pre-alpha
          </div>
          <p
            className="text-[11px] leading-[1.5]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Live on Solana <span className="font-semibold">devnet</span>. Kyvern
            program unaudited.
          </p>
        </div>
      </div>
    </aside>
  );
}

function itemIsActive(
  pathname: string,
  item: { href: string; matchExact?: boolean },
): boolean {
  if (item.matchExact) return pathname === item.href;
  if (item.href === "/app") return pathname === "/app";

  // Cross-product aliasing — keep the sidebar coherent when the user
  // navigates to a legacy route that represents one of our unified
  // sections:
  //   · /pulse/dashboard/*  → earn side ("Services")
  //   · /vault, /vault/*    → pay side ("Vaults")
  if (item.href === "/app/services" && pathname.startsWith("/pulse/dashboard")) {
    return true;
  }
  if (
    item.href === "/app/vaults" &&
    (pathname === "/vault" ||
      pathname.startsWith("/vault/") ||
      pathname === "/vault/new")
  ) {
    return true;
  }

  return pathname === item.href || pathname.startsWith(item.href + "/");
}
