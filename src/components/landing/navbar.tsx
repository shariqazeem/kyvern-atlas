"use client";

/* ════════════════════════════════════════════════════════════════════
   Navbar — single product. KyvernLabs mark, three links, one CTA.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KyvernMark } from "@/components/brand/kyvern-mark";
import { EASE_PREMIUM as ease } from "@/lib/motion";

/**
 * Nav structure deliberately shows NO product names.
 *
 * Previously this listed "Vault" and "Pulse" as sibling navigation
 * items — which forced visitors to pick-a-product before they even
 * understood what Kyvern was. Billion-dollar products never put the
 * user in that position (Stripe doesn't show "Payments · Atlas ·
 * Connect" as top nav — it shows "Products · Developers · Company").
 *
 * Kyvern is ONE product with two sides (spend, earn). Both sides live
 * inside the app — the marketing site just sells "Kyvern" itself.
 */
const NAV_LINKS = [
  { label: "How it works", href: "#stack" },
  { label: "Developers", href: "#developers" },
  { label: "Docs", href: "/docs" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, wallet } = useAuth();
  const loggedIn = isAuthenticated && !!wallet;

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div
            className="flex items-center justify-between h-[50px] pl-3.5 pr-2.5 rounded-[14px]"
            style={{
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "saturate(180%) blur(22px)",
              WebkitBackdropFilter: "saturate(180%) blur(22px)",
              border: "0.5px solid var(--border-subtle)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.03), 0 10px 32px -14px rgba(0,0,0,0.06)",
            }}
          >
            {/* Logo — KyvernMark is the shared-element tile. Gets a
                stable view-transition-name and layoutId so supporting
                browsers morph it between routes. */}
            <Link href="/" className="flex items-center gap-2">
              <KyvernMark size={28} />
              <span
                className="text-[15px] font-semibold"
                style={{
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Kyvern
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="h-9 px-3.5 inline-flex items-center rounded-[10px] text-[13.5px] font-medium transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* CTA + mobile toggle */}
            <div className="flex items-center gap-1.5">
              {!loggedIn && (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center h-9 px-3.5 rounded-[10px] text-[13.5px] font-medium transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Log in
                </Link>
              )}
              <Link
                href="/app"
                className="group hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-opacity duration-200 hover:opacity-90"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--background)",
                }}
              >
                {loggedIn ? "Open Kyvern" : "Start free"}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors"
                style={{ color: "var(--text-primary)" }}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease }}
            className="md:hidden mx-6 mt-2 p-3 rounded-[16px]"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "saturate(180%) blur(20px)",
              WebkitBackdropFilter: "saturate(180%) blur(20px)",
              border: "0.5px solid var(--border-subtle)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08)",
            }}
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 px-4 text-[15px] font-medium rounded-[10px] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {item.label}
              </a>
            ))}
            <div
              className="my-2 h-px"
              style={{ background: "var(--border)" }}
            />
            {!loggedIn && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-3 px-4 text-[15px] font-medium rounded-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                Log in
              </Link>
            )}
            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 h-12 rounded-[12px] text-[15px] font-semibold"
              style={{
                background: "var(--text-primary)",
                color: "var(--background)",
              }}
            >
              {loggedIn ? "Open Kyvern" : "Start free"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </motion.nav>
    </>
  );
}
