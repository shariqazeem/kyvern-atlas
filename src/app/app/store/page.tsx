"use client";

/**
 * /app/store — Tool Library.
 *
 * Reframed from "Ability Store" to "Tools for your agents."
 * Tools are not installed standalone — they're granted to agents
 * during the spawn flow. This page is informational + the link to
 * spawn an agent that uses these tools.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  costsMoney: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  earn: "#00A86B",
  spend: "#0052FF",
  protect: "#D92D20",
  read: "#6B6B6B",
  monitor: "#0052FF",
  communicate: "#9B9B9B",
};

export default function ToolLibraryPage() {
  const [tools, setTools] = useState<ToolMeta[]>([]);

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((d) => setTools(d?.tools ?? []));
  }, []);

  return (
    <div className="py-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A]">
          Tool Library
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">
          What your agents can do. Granted at spawn time.
        </p>
      </motion.div>

      <div className="space-y-2 mb-6">
        {tools.map((t, i) => {
          const color = CATEGORY_COLORS[t.category] ?? "#9B9B9B";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-[14px] p-4"
              style={{
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-semibold text-[#0A0A0A]">{t.name}</p>
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${color}10`, color }}
                    >
                      {t.category}
                    </span>
                    {t.costsMoney && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: "#FEF3C7", color: "#D97706" }}
                      >
                        ON-CHAIN
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] leading-[1.5]">
                    {t.description}
                  </p>
                  <code
                    className="inline-block text-[10px] font-mono mt-2 px-1.5 py-0.5 rounded"
                    style={{ background: "#F5F5F5", color: "#6B6B6B" }}
                  >
                    {t.id}
                  </code>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Link
        href="/app/agents/spawn"
        className="block rounded-[16px] p-4 text-center transition-all active:scale-[0.99]"
        style={{
          background: "#0A0A0A",
          color: "#fff",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-[14px] font-semibold">
            Spawn an agent that uses these tools
          </span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
}
