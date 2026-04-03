"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 border-b border-black/[0.04]">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/og-image.jpg" alt="KyvernLabs" width={24} height={24} className="rounded-md" />
            <span className="text-[13px] font-semibold tracking-tight text-primary">
              KyvernLabs
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-7">
              {["Products", "Developers", "Docs"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-[13px] text-tertiary hover:text-primary transition-colors duration-300"
                >
                  {item}
                </a>
              ))}
            </div>
            <Link
              href="/pulse/dashboard"
              className="group inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              Open Pulse
              <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
