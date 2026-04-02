"use client";

import { motion } from "framer-motion";
import { AlertCircle, BarChart3, Users, DollarSign } from "lucide-react";

const PAIN_POINTS = [
  {
    icon: BarChart3,
    title: "No revenue visibility",
    desc: "You don't know how much you're making per endpoint, per day, per customer.",
  },
  {
    icon: Users,
    title: "No customer insights",
    desc: "Which agents are your top payers? Are they increasing or decreasing usage?",
  },
  {
    icon: DollarSign,
    title: "No pricing intelligence",
    desc: "Are you charging too much? Too little? How do you compare to competitors?",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <AlertCircle className="w-4 h-4" />
            The problem
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            90+ x402 services. Zero business intelligence.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            The x402 ecosystem has $10M+ in volume and 35M+ transactions. But every
            service provider is flying blind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PAIN_POINTS.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="bg-white rounded-lg border border-border p-6 shadow-premium"
            >
              <point.icon className="w-5 h-5 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {point.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
