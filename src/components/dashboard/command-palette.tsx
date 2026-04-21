"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandRoot } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Globe,
  Users,
  BarChart3,
  TrendingUp,
  Key,
  Webhook,
  Bell,
  Code2,
  CreditCard,
  Settings,
  Search,
  Download,
  RotateCw,
  Sparkles,
  DollarSign,
  Activity,
  Hash,
  Wallet,
  Plus,
  Home,
  Zap,
} from "lucide-react";

/* ── Navigation items (mirrors sidebar) ──────────────────────────
   Grouped so users can reason about pay-side vs earn-side. Cmd+K is a
   power-user tool — label groups explicitly so it's obvious where
   each destination lives in the unified Kyvern app. */
const NAV_ITEMS = [
  // Home
  { label: "Home", href: "/app", icon: Home, keywords: ["dashboard", "start", "overview", "app"], group: "Home" },
  // Pay side — Vault
  { label: "Vaults", href: "/app/vaults", icon: Wallet, keywords: ["pay", "agent", "spending"], group: "Spend" },
  { label: "Create vault", href: "/vault/new", icon: Plus, keywords: ["new vault", "add vault", "agent visa"], group: "Spend" },
  // Earn side — Pulse
  { label: "Services", href: "/app/services", icon: Zap, keywords: ["earn", "pulse", "endpoints"], group: "Earn" },
  { label: "Overview", href: "/pulse/dashboard", icon: LayoutDashboard, keywords: ["pulse home", "dashboard", "main"], group: "Earn" },
  { label: "Transactions", href: "/pulse/dashboard/transactions", icon: ArrowLeftRight, keywords: ["payments", "history", "tx"], group: "Earn" },
  { label: "Endpoints", href: "/pulse/dashboard/endpoints", icon: Globe, keywords: ["apis", "routes", "urls"], group: "Earn" },
  { label: "Customers", href: "/pulse/dashboard/customers", icon: Users, keywords: ["agents", "payers", "wallets"], group: "Earn" },
  { label: "Benchmarks", href: "/pulse/dashboard/benchmarks", icon: BarChart3, keywords: ["compare", "pricing", "competitors"], group: "Earn" },
  { label: "Cohorts", href: "/pulse/dashboard/cohorts", icon: Users, keywords: ["segments", "groups", "retention"], group: "Earn" },
  { label: "Intelligence", href: "/pulse/dashboard/intelligence", icon: TrendingUp, keywords: ["insights", "ai", "trends"], group: "Earn" },
  { label: "Webhooks", href: "/pulse/dashboard/webhooks", icon: Webhook, keywords: ["hooks", "notifications", "events"], group: "Earn" },
  { label: "Alerts", href: "/pulse/dashboard/alerts", icon: Bell, keywords: ["notifications", "warnings", "monitors"], group: "Earn" },
  { label: "Setup Guide", href: "/pulse/dashboard/setup", icon: Code2, keywords: ["install", "integration", "docs", "middleware"], group: "Earn" },
  // Shared
  { label: "Payments", href: "/app/payments", icon: ArrowLeftRight, keywords: ["history", "feed", "activity", "tx"], group: "Shared" },
  { label: "API Keys", href: "/app/keys", icon: Key, keywords: ["tokens", "auth", "credentials"], group: "Shared" },
  { label: "Settings", href: "/app/settings", icon: Settings, keywords: ["preferences", "config", "account"], group: "Shared" },
  { label: "Billing", href: "/pulse/dashboard/billing", icon: CreditCard, keywords: ["plan", "subscription", "invoice", "payment"], group: "Shared" },
];

const ACTION_ITEMS = [
  { label: "Create a new vault", href: "/vault/new", icon: Plus, keywords: ["new vault", "agent visa", "start"] },
  { label: "Run earn-side simulator", href: "/app/services", icon: Sparkles, keywords: ["demo data", "seed", "try earn"] },
  { label: "Create Alert", href: "/pulse/dashboard/alerts", icon: Bell, keywords: ["new alert", "monitor", "notification"] },
  { label: "Export CSV", action: "export", icon: Download, keywords: ["download", "data", "spreadsheet"] },
  { label: "Rotate API Key", href: "/pulse/dashboard/keys", icon: RotateCw, keywords: ["regenerate", "new key", "reset"] },
  { label: "Upgrade to Pro", href: "/pulse/upgrade", icon: Sparkles, keywords: ["plan", "premium", "unlock"] },
];

const STAT_KEYWORDS = ["revenue", "stats", "calls", "customers", "money", "earnings", "volume"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<{
    revenue: number;
    calls: number;
    customers: number;
  } | null>(null);
  const router = useRouter();

  /* ── Keyboard shortcut: Cmd+K / Ctrl+K ───────────────────────── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── Fetch quick stats when opened ───────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setSearch("");
    fetch("/api/pulse/stats?range=7d", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStats({
            revenue: d.total_revenue ?? d.revenue ?? 0,
            calls: d.total_calls ?? d.calls ?? 0,
            customers: d.unique_customers ?? d.customers ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleExport = useCallback(() => {
    setOpen(false);
    window.open("/api/pulse/export?type=transactions&range=7d", "_blank");
  }, []);

  const showStats =
    search.length > 0 &&
    STAT_KEYWORDS.some((kw) => search.toLowerCase().includes(kw));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[101] flex items-start justify-center pt-[min(20vh,140px)]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-[560px] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CommandRoot
                label="Command palette"
                loop
                className="bg-white rounded-xl border border-black/[0.08] shadow-[0_16px_70px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
              >
                {/* ── Search input ──────────────────────────────── */}
                <div className="flex items-center gap-2.5 px-4 h-12 border-b border-black/[0.06]">
                  <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <CommandRoot.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search pages, actions, stats..."
                    className="flex-1 bg-transparent text-[13px] font-medium text-slate-900 placeholder:text-[var(--text-tertiary)] outline-none"
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-tertiary)] bg-[#F5F5F5] border border-black/[0.06] rounded px-1.5 py-0.5 font-mono">
                    ESC
                  </kbd>
                </div>

                {/* ── Results list ──────────────────────────────── */}
                <CommandRoot.List className="max-h-[min(60vh,380px)] overflow-y-auto overscroll-contain p-2 scroll-py-2">
                  <CommandRoot.Empty className="flex flex-col items-center justify-center py-10 text-[13px] text-[hsl(var(--text-tertiary))]">
                    <Search className="w-5 h-5 mb-2 text-[var(--text-tertiary)]" />
                    No results found.
                  </CommandRoot.Empty>

                  {/* ── Quick Stats (shown when typing stat keywords) ── */}
                  {showStats && stats && (
                    <CommandRoot.Group
                      heading={
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.1em] px-2">
                          Quick Stats (7d)
                        </span>
                      }
                    >
                      <CommandRoot.Item
                        value="stat-revenue"
                        keywords={["revenue", "money", "earnings"]}
                        onSelect={() => navigate("/pulse/dashboard")}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-colors data-[selected=true]:bg-[#F5F5F5]"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900">Revenue</p>
                          <p className="text-[11px] text-[hsl(var(--text-tertiary))] font-mono">
                            ${stats.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </CommandRoot.Item>
                      <CommandRoot.Item
                        value="stat-calls"
                        keywords={["calls", "requests", "volume"]}
                        onSelect={() => navigate("/pulse/dashboard/transactions")}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-colors data-[selected=true]:bg-[#F5F5F5]"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900">API Calls</p>
                          <p className="text-[11px] text-[hsl(var(--text-tertiary))] font-mono">
                            {stats.calls.toLocaleString()}
                          </p>
                        </div>
                      </CommandRoot.Item>
                      <CommandRoot.Item
                        value="stat-customers"
                        keywords={["customers", "agents", "payers"]}
                        onSelect={() => navigate("/pulse/dashboard/customers")}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-colors data-[selected=true]:bg-[#F5F5F5]"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50">
                          <Hash className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-900">Unique Customers</p>
                          <p className="text-[11px] text-[hsl(var(--text-tertiary))] font-mono">
                            {stats.customers.toLocaleString()}
                          </p>
                        </div>
                      </CommandRoot.Item>
                    </CommandRoot.Group>
                  )}

                  {/* ── Navigation — grouped by side so Cmd+K reads like
                      the sidebar (Home / Pay / Earn / Shared) ────── */}
                  {["Home", "Spend", "Earn", "Shared"].map((groupName) => {
                    const items = NAV_ITEMS.filter((i) => i.group === groupName);
                    if (items.length === 0) return null;
                    return (
                      <CommandRoot.Group
                        key={groupName}
                        heading={
                          <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.1em] px-2">
                            {groupName}
                          </span>
                        }
                      >
                        {items.map((item) => (
                          <CommandRoot.Item
                            key={item.href}
                            value={item.label}
                            keywords={item.keywords}
                            onSelect={() => navigate(item.href)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-colors data-[selected=true]:bg-[#F5F5F5]"
                          >
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F5F5F5] data-[selected=true]:bg-[#EBEBEB] transition-colors">
                              <item.icon className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                            </div>
                            <span className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
                              {item.label}
                            </span>
                          </CommandRoot.Item>
                        ))}
                      </CommandRoot.Group>
                    );
                  })}

                  {/* ── Actions ─────────────────────────────────── */}
                  <CommandRoot.Group
                    heading={
                      <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.1em] px-2">
                        Actions
                      </span>
                    }
                  >
                    {ACTION_ITEMS.map((item) => (
                      <CommandRoot.Item
                        key={item.label}
                        value={item.label}
                        keywords={item.keywords}
                        onSelect={() => {
                          if (item.action === "export") {
                            handleExport();
                          } else if (item.href) {
                            navigate(item.href);
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-colors data-[selected=true]:bg-[#F5F5F5]"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F5F5F5] transition-colors">
                          <item.icon className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))]" />
                        </div>
                        <span className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
                          {item.label}
                        </span>
                      </CommandRoot.Item>
                    ))}
                  </CommandRoot.Group>
                </CommandRoot.List>

                {/* ── Footer ───────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/[0.06] bg-[#FAFAFA]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white border border-black/[0.08] rounded text-[10px] font-mono font-medium text-[hsl(var(--text-tertiary))]">
                        &uarr;
                      </kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white border border-black/[0.08] rounded text-[10px] font-mono font-medium text-[hsl(var(--text-tertiary))]">
                        &darr;
                      </kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white border border-black/[0.08] rounded text-[10px] font-mono font-medium text-[hsl(var(--text-tertiary))]">
                        &crarr;
                      </kbd>
                      Select
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Kyvern Command Palette
                  </span>
                </div>
              </CommandRoot>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
