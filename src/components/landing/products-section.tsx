"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  Shield,
  GitBranch,
  Store,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCTS = [
  {
    name: "Pulse",
    tagline: "Revenue intelligence for x402",
    desc: "Real-time analytics for your x402 endpoints. Track revenue, customers, performance — with one-line middleware integration.",
    icon: Activity,
    status: "live" as const,
    href: "/pulse/dashboard",
  },
  {
    name: "Vault",
    tagline: "Smart contract wallets",
    desc: "Per-agent budgets, spending limits, and automated treasury management for x402 payments.",
    icon: Shield,
    status: "coming" as const,
    href: "#",
  },
  {
    name: "Router",
    tagline: "Smart x402 routing",
    desc: "Route requests to the cheapest, fastest, or most reliable x402 service automatically.",
    icon: GitBranch,
    status: "coming" as const,
    href: "#",
  },
  {
    name: "Marketplace",
    tagline: "Launch x402 APIs",
    desc: "Create, price, and distribute x402 endpoints in minutes. The Shopify of agent APIs.",
    icon: Store,
    status: "coming" as const,
    href: "#",
  },
];

export function ProductsSection() {
  return (
    <section id="products" className="py-28 lg:py-36 px-6 bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
          <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
            Products
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
            The full x402 business stack
          </h2>
          <p className="mt-4 text-[15px] text-tertiary max-w-lg mx-auto">
            Everything to run a profitable x402 service. Starting with Pulse.
          </p>
        </motion.div>

        {/* Bento grid — Pulse large, others smaller */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={cn(
                "group rounded-xl border p-7 lg:p-8 transition-all duration-300",
                product.status === "live"
                  ? "border-black/[0.08] bg-white hover:border-black/[0.15] hover:shadow-premium-lg md:col-span-2"
                  : "border-black/[0.04] bg-white/60 opacity-70 hover:opacity-80"
              )}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      product.status === "live"
                        ? "bg-foreground text-background"
                        : "bg-black/[0.04] text-quaternary"
                    )}
                  >
                    <product.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-tight">{product.name}</h3>
                    <p className="text-[12px] text-tertiary">{product.tagline}</p>
                  </div>
                </div>
                {product.status === "live" ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-black/[0.03] text-quaternary uppercase tracking-wider">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-[14px] text-secondary leading-relaxed max-w-xl">
                {product.desc}
              </p>
              {product.status === "live" && (
                <Link
                  href={product.href}
                  className="group/link inline-flex items-center gap-1.5 mt-6 text-[13px] font-medium text-primary hover:text-pulse transition-colors duration-300"
                >
                  Open Dashboard
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
