"use client";

/**
 * Minimal dark navbar for the device-themed landing page.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { EASE_PREMIUM as ease } from "@/lib/motion";

const NAV_LINKS = [
  { label: "Atlas", href: "/atlas" },
  { label: "Docs", href: "/docs" },
];

export function DeviceNavbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 sm:px-8 h-14"
      style={{
        background: "rgba(5,5,5,0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <span
          className="font-mono text-[12px] font-bold tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          KYVERN
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-5">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13px] font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/vault/new"
          className="hidden sm:inline-flex items-center h-8 px-4 rounded-full text-[12px] font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Create device
        </Link>
      </div>
    </motion.nav>
  );
}
