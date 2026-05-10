"use client";

/**
 * AliveConsole — /app's mission-control stage.
 *
 * Post-pivot (2026-05-10): the body of /app is now a single Worker
 * Card (Atlas), framed as the reference autonomous worker, plus a
 * Deploy-a-Worker template gallery and a small Developer-mode link.
 *
 * The earlier two-column wizard+feed layout moved to /app/developer
 * — kept for SDK users, off the main stage. Atlas's data is real,
 * unbroken since 2026-04-20, and tells the inevitability story
 * better than any onboarding wizard could.
 *
 * Props are kept compatible with the prior shape since /app/page.tsx
 * still passes them in; vaultId / ownerWallet / etc. are no longer
 * read by the body, but the prop surface stays so callers don't break.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, ArrowRight } from "lucide-react";
import { WorkerCard } from "../worker/worker-card";
import { WorkerTemplates } from "../worker/worker-templates";
import type { PanelKind } from "../home/affordance-row";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  agentKeyPrefix: string | null;
  usdcBalance: number;
  paused?: boolean;
  network?: "devnet" | "mainnet";
  onTileClick?: (panel: PanelKind) => void;
  className?: string;
}

export function AliveConsole({ className }: Props) {
  return (
    <div className={`flex flex-col gap-4 sm:gap-5 ${className ?? ""}`}>
      {/* Whisper line — sets the frame: Atlas is the proof, deploy your own. */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="text-center px-4"
      >
        <p
          className="text-[12.5px] tracking-[-0.005em]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Atlas is the reference autonomous worker — running for 20 days on
          Solana devnet. Provision your own vault to build the next one.
        </p>
      </motion.div>

      {/* Hero: Atlas worker card — the unforgettable proof */}
      <WorkerCard />

      {/* Deploy a Worker — 1 real (Clone Atlas) + 4 roadmap */}
      <WorkerTemplates />

      {/* Developer mode — discoverable but off-stage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        className="flex items-center justify-center pt-1"
      >
        <Link
          href="/app/developer"
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-[rgba(15,23,42,0.04)]"
        >
          <Code2
            className="w-3.5 h-3.5"
            style={{ color: "rgba(15,23,42,0.55)" }}
            strokeWidth={2}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Developer mode
          </span>
          <span
            className="text-[11.5px]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            mint key · install SDK · run a chain-enforced payment
          </span>
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: "rgba(15,23,42,0.55)" }}
            strokeWidth={2}
          />
        </Link>
      </motion.div>
    </div>
  );
}
