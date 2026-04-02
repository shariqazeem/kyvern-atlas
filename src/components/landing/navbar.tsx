"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">K</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">KyvernLabs</span>
        </Link>

        <div className="flex items-center gap-8">
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#products" className="hover:text-foreground transition-colors ease-premium">
              Products
            </a>
            <a href="#developers" className="hover:text-foreground transition-colors ease-premium">
              Developers
            </a>
          </div>
          <Link
            href="/pulse/dashboard"
            className="inline-flex items-center justify-center h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 ease-premium transition-opacity"
          >
            Open Pulse
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
