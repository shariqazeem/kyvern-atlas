"use client";

/**
 * ScrollAwareNav — landing-page nav that toggles register based on
 * scroll position.
 *
 * The new landing alternates dark museum-mode sections with light
 * product sections. A single static navbar would either feel wrong
 * over the dark hero (white background blocks the manifesto) or
 * wrong over the light sections (transparent disappears).
 *
 * Behavior:
 *   - At the very top (above 80px) → fully transparent, white text
 *     so the navbar fades into the dark hero
 *   - After 80px → solid white pill with dark text + subtle shadow
 *   - Sticky `fixed top-0` so it follows the scroll
 *
 * Mobile: transparent → solid same way; the menu toggle remains
 * legible against either background via dynamic icon color.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { KyvernMark } from "@/components/brand/kyvern-mark";

const NAV_LINKS = [
  { label: "Atlas", href: "/atlas" },
  { label: "Docs", href: "/docs" },
  {
    label: "GitHub",
    href: "https://github.com/shariqazeem/kyvern-atlas",
    external: true,
  },
];

export function ScrollAwareNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, wallet } = useAuth();
  const loggedIn = isAuthenticated && !!wallet;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Visual register tokens — flipped on scroll
  const bg = scrolled
    ? "rgba(255,255,255,0.82)"
    : "transparent";
  const border = scrolled
    ? "1px solid rgba(15,23,42,0.06)"
    : "1px solid rgba(255,255,255,0.10)";
  const shadow = scrolled
    ? "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -10px rgba(15,23,42,0.10)"
    : "none";
  const textColor = scrolled ? "#0A0A0A" : "rgba(255,255,255,0.92)";
  const linkColor = scrolled ? "#374151" : "rgba(255,255,255,0.78)";
  const linkHover = scrolled ? "#0A0A0A" : "#FFFFFF";

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4">
          <div
            className="flex items-center justify-between h-[50px] pl-3.5 pr-2.5 rounded-[14px] transition-all duration-300"
            style={{
              background: bg,
              border,
              boxShadow: shadow,
              backdropFilter: scrolled ? "blur(14px)" : "blur(6px)",
              WebkitBackdropFilter: scrolled ? "blur(14px)" : "blur(6px)",
            }}
          >
            <Link href="/" className="inline-flex items-center gap-2">
              <KyvernMark size={22} />
              <span
                className="text-[15px] font-semibold tracking-[-0.01em] transition-colors"
                style={{ color: textColor }}
              >
                Kyvern
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((l) =>
                l.external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-colors"
                    style={{ color: linkColor }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = linkHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-colors"
                    style={{ color: linkColor }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = linkHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href={loggedIn ? "/app" : "/login"}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: scrolled ? "#0A0A0A" : "#FFFFFF",
                  color: scrolled ? "#FFFFFF" : "#0A0B10",
                  boxShadow: scrolled
                    ? "0 1px 2px rgba(15,23,42,0.06)"
                    : "0 1px 0 rgba(255,255,255,0.18), 0 8px 22px rgba(0,0,0,0.35)",
                }}
              >
                {loggedIn ? "Open Kyvern" : "Get started"}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-[8px]"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              style={{ color: textColor }}
            >
              {mobileOpen ? (
                <X className="w-4.5 h-4.5" strokeWidth={2} />
              ) : (
                <Menu className="w-4.5 h-4.5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-[68px] left-4 right-4 z-50 md:hidden rounded-[14px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 24px 56px -16px rgba(15,23,42,0.30)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="flex flex-col p-2">
            {NAV_LINKS.map((l) =>
              l.external ? (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-[14px] font-medium rounded-[8px] hover:bg-black/5"
                  style={{ color: "#0A0A0A" }}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-[14px] font-medium rounded-[8px] hover:bg-black/5"
                  style={{ color: "#0A0A0A" }}
                >
                  {l.label}
                </Link>
              ),
            )}
            <Link
              href={loggedIn ? "/app" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[14px] font-semibold"
              style={{ background: "#0A0A0A", color: "#FFFFFF" }}
            >
              {loggedIn ? "Open Kyvern" : "Get started"}
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </motion.div>
      )}
    </>
  );
}
