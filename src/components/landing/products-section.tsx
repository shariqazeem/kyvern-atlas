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
    desc: "Real-time analytics dashboard for your x402 endpoints. Track revenue, customers, and performance with one-line middleware integration.",
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
    desc: "Automatically route requests to the cheapest, fastest, or most reliable x402 service provider.",
    icon: GitBranch,
    status: "coming" as const,
    href: "#",
  },
  {
    name: "Marketplace",
    tagline: "Launch x402 APIs in minutes",
    desc: "Full platform to create, price, and distribute x402 endpoints. The Shopify of agent APIs.",
    icon: Store,
    status: "coming" as const,
    href: "#",
  },
];

export function ProductsSection() {
  return (
    <section id="products" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-semibold tracking-tight">
            The full x402 business stack
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Everything you need to run a profitable x402 service. Starting with Pulse.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={cn(
                "rounded-lg border p-6 transition-shadow ease-premium",
                product.status === "live"
                  ? "border-pulse-200 bg-pulse-50/50 shadow-premium hover:shadow-premium-lg"
                  : "border-border bg-white opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      product.status === "live" ? "bg-pulse text-white" : "bg-muted"
                    )}
                  >
                    <product.icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.tagline}</p>
                  </div>
                </div>
                {product.status === "live" ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {product.desc}
              </p>
              {product.status === "live" && (
                <Link
                  href={product.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-pulse hover:underline"
                >
                  Open Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
