"use client";

/**
 * BuilderModal — the agent composer entry surface.
 *
 * Three-step flow:
 *   1. PICK   — recipe gallery + "Start blank" entry
 *   2. EDIT   — full composer (name, trigger, steps, test, deploy)
 *   3. DEPLOYED — confirmation
 *
 * Open / close lifecycle is owned by the parent (the alive console
 * mounts this modal with `open` state). Closing mid-edit prompts
 * the user.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import { RECIPES, cloneRecipeGraph, type RecipeDef } from "@/lib/agents/graph/recipes";
import { Composer } from "./composer";
import { RecipeGallery } from "./recipe-gallery";
import type { AgentGraph } from "@/lib/agents/graph/types";

interface Props {
  open: boolean;
  vaultId: string | null;
  ownerWallet: string | null;
  onClose: () => void;
  /** Optional: when editing an existing agent, seed the composer
   *  with its current graph + name + emoji. */
  editingAgent?: {
    id: string;
    name: string;
    emoji: string;
    graph: AgentGraph;
  };
  /** Called when an agent is successfully deployed (created or
   *  updated). Parent uses this to refresh the canvas. */
  onDeployed: (agentId: string) => void;
}

type Step = "pick" | "edit";

export function BuilderModal({
  open,
  vaultId,
  ownerWallet,
  onClose,
  editingAgent,
  onDeployed,
}: Props) {
  // If editing, skip the pick step entirely.
  const [step, setStep] = useState<Step>(editingAgent ? "edit" : "pick");
  const [seedGraph, setSeedGraph] = useState<AgentGraph | null>(
    editingAgent?.graph ?? null,
  );
  const [seedName, setSeedName] = useState<string>(editingAgent?.name ?? "");
  const [seedEmoji, setSeedEmoji] = useState<string>(editingAgent?.emoji ?? "🤖");

  function handleRecipePick(recipe: RecipeDef) {
    setSeedGraph(cloneRecipeGraph(recipe));
    setSeedName(recipe.name);
    setSeedEmoji(recipe.emoji);
    setStep("edit");
  }

  function handleStartBlank() {
    setSeedGraph(emptyGraph());
    setSeedName("");
    setSeedEmoji("🤖");
    setStep("edit");
  }

  function handleClose() {
    // TODO: confirm if step === "edit" with unsaved changes
    onClose();
    // Reset state on close so reopening starts fresh
    setTimeout(() => {
      if (!editingAgent) {
        setStep("pick");
        setSeedGraph(null);
        setSeedName("");
        setSeedEmoji("🤖");
      }
    }, 200);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center pointer-events-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative w-full max-w-[920px] flex flex-col pointer-events-auto"
              style={{
                background: "#FFFFFF",
                borderRadius: 18,
                margin: "16px",
                maxHeight: "calc(100vh - 32px)",
                boxShadow:
                  "0 1px 2px rgba(15,23,42,0.04), 0 24px 80px -16px rgba(15,23,42,0.40)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
              >
                <div className="flex items-center gap-2">
                  {step === "edit" && !editingAgent && (
                    <button
                      type="button"
                      onClick={() => setStep("pick")}
                      className="p-1 rounded hover:bg-slate-100"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h2
                    className="text-[15px] font-semibold tracking-[-0.01em]"
                    style={{ color: "#0A0A0A" }}
                  >
                    {editingAgent
                      ? `Edit · ${editingAgent.name}`
                      : step === "pick"
                        ? "Deploy a new agent"
                        : "Compose"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {step === "pick" && (
                  <RecipeGallery
                    recipes={RECIPES}
                    onPick={handleRecipePick}
                    onStartBlank={handleStartBlank}
                  />
                )}
                {step === "edit" && seedGraph && (
                  <Composer
                    initialGraph={seedGraph}
                    initialName={seedName}
                    initialEmoji={seedEmoji}
                    vaultId={vaultId}
                    ownerWallet={ownerWallet}
                    editingAgentId={editingAgent?.id ?? null}
                    onDeployed={(id) => {
                      onDeployed(id);
                      handleClose();
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function emptyGraph(): AgentGraph {
  return {
    version: 1,
    trigger: { kind: "manual" },
    config: { maxRunsPerDay: 50, maxCostPerRunUsd: 1.00 },
    steps: [],
  };
}
