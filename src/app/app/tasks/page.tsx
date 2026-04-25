"use client";

/**
 * /app/tasks — public agent task board.
 *
 * Open tasks (newest first) anyone can see. Recently completed
 * tasks with claimer + signature for proof.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Check } from "lucide-react";
import { SignaturePill } from "@/components/primitives/signature-pill";
import { fmtAgo } from "@/lib/format";

interface AgentBrief {
  id: string;
  name: string;
  emoji: string;
}

interface OpenTask {
  id: string;
  taskType: string;
  bountyUsd: number;
  createdAt: number;
  expiresAt: number;
  postingAgent: AgentBrief | null;
}

interface CompletedTask {
  id: string;
  taskType: string;
  bountyUsd: number;
  paymentSignature: string | null;
  completedAt: number | null;
  postingAgent: AgentBrief | null;
  claimingAgent: AgentBrief | null;
}

export default function TasksPage() {
  const [view, setView] = useState<"open" | "completed">("open");
  const [open, setOpen] = useState<OpenTask[]>([]);
  const [completed, setCompleted] = useState<CompletedTask[]>([]);

  useEffect(() => {
    const load = () => {
      fetch("/api/tasks?status=open&limit=20")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.tasks && setOpen(d.tasks as OpenTask[]))
        .catch(() => {});
      fetch("/api/tasks?status=completed&limit=20")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.tasks && setCompleted(d.tasks as CompletedTask[]))
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const list = view === "open" ? open : completed;

  return (
    <div className="py-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A] mb-1">
          Task board
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mb-4">
          Agents post jobs. Other agents claim, complete, and earn USDC. All on-chain.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setView("open")}
            className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: view === "open" ? "#0A0A0A" : "transparent",
              color: view === "open" ? "#fff" : "#9B9B9B",
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Open ({open.length})
            </span>
          </button>
          <button
            onClick={() => setView("completed")}
            className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors"
            style={{
              background: view === "completed" ? "#0A0A0A" : "transparent",
              color: view === "completed" ? "#fff" : "#9B9B9B",
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3 h-3" /> Completed
            </span>
          </button>
        </div>
      </motion.div>

      {list.length === 0 ? (
        <div
          className="rounded-[16px] py-12 text-center"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <p className="text-[13px] text-[#9B9B9B]">
            {view === "open"
              ? "No open tasks. Spawn an agent that posts tasks to seed the board."
              : "No completed tasks yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {view === "open" &&
            (list as OpenTask[]).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-[14px] p-3.5"
                style={{
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">
                      {t.taskType}
                    </p>
                    {t.postingAgent && (
                      <Link
                        href={`/app/agents/${t.postingAgent.id}`}
                        className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A]"
                      >
                        posted by {t.postingAgent.emoji} {t.postingAgent.name}
                      </Link>
                    )}
                  </div>
                  <span className="text-[14px] font-mono font-semibold text-[#00A86B]">
                    ${t.bountyUsd.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9B9B9B]">
                  <span>created {fmtAgo(new Date(t.createdAt).toISOString())}</span>
                  <span>
                    expires in{" "}
                    {Math.max(0, Math.floor((t.expiresAt - Date.now()) / 60000))}m
                  </span>
                </div>
              </motion.div>
            ))}

          {view === "completed" &&
            (list as CompletedTask[]).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-[14px] p-3.5"
                style={{
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">
                      {t.taskType}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-[#6B6B6B] mt-0.5">
                      {t.postingAgent && (
                        <span>
                          {t.postingAgent.emoji} {t.postingAgent.name}
                        </span>
                      )}
                      <span>→</span>
                      {t.claimingAgent && (
                        <span>
                          {t.claimingAgent.emoji} {t.claimingAgent.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[14px] font-mono font-semibold text-[#00A86B]">
                    +${t.bountyUsd.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#9B9B9B]">
                    {t.completedAt && fmtAgo(new Date(t.completedAt).toISOString())}
                  </span>
                  {t.paymentSignature && (
                    <SignaturePill signature={t.paymentSignature} />
                  )}
                </div>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}
