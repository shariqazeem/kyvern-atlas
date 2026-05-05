import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/agents/store";
import { getTemplate } from "@/lib/agents/templates";
import { getVault } from "@/lib/vault-store";
import type { AgentTemplate } from "@/lib/agents/types";
import {
  buildFirstSixtySeconds,
  BOOT_BEAT_OFFSETS_MS,
} from "@/lib/agents/first-messages";
import { writeBootBeats } from "@/lib/agents/status-updates";

/**
 * POST /api/devices/[id]/deploy-preset
 *
 * Tab 2 (Deploy Worker) — 1-click preset deploy. Takes just a template
 * id and resolves the rest of the spec server-side from the template
 * registry. Same shape as /api/agents/spawn but doesn't require the
 * client to know the template's job prompt + tools + frequency.
 *
 * Mirrors what seedDefaultWorkersIfEmpty does for the trio. The new
 * agent appears in Tab 1's chassis next to the existing workers.
 */

const PRESET_NAMES: Record<string, { name: string; emoji: string }> = {
  bounty_hunter: { name: "Sentinel", emoji: "🎯" },
  whale_tracker: { name: "Wren", emoji: "🐋" },
  token_pulse: { name: "Pulse", emoji: "📈" },
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      template?: string;
      name?: string;
    };
    const templateId = String(body.template ?? "").trim();
    if (!templateId) {
      return NextResponse.json(
        { error: "template required" },
        { status: 400 },
      );
    }

    const vault = getVault(params.id);
    if (!vault) {
      return NextResponse.json(
        { error: "device not found" },
        { status: 404 },
      );
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "invalid template" },
        { status: 400 },
      );
    }

    // Default the name + emoji from the trio register so a 1-click
    // "Deploy a Sentinel" produces a worker that reads as a Sentinel.
    // User can rename via /app/settings later.
    const preset = PRESET_NAMES[templateId];
    const name = body.name?.trim() ||
      (preset ? `${preset.name} #${suffix()}` : `${template.name} ${suffix()}`);
    const emoji = preset?.emoji ?? template.emoji;

    // Resolve the job prompt + recommended tools from the template.
    const jobPrompt =
      template.jobSuggestions[0]?.job ?? template.jobPromptExample;
    const allowedTools = template.recommendedTools;
    const frequencySeconds = template.defaultFrequencySeconds;
    const personalityPrompt = template.personalityPrompt;

    const firstSixty = buildFirstSixtySeconds({
      name,
      template: templateId as AgentTemplate,
      jobPrompt,
      frequencySeconds,
    });

    const agent = createAgent({
      deviceId: params.id,
      name,
      emoji,
      template: templateId as AgentTemplate,
      personalityPrompt,
      jobPrompt,
      allowedTools,
      frequencySeconds,
      isPublic: false,
      metadata: {
        firstMessage: firstSixty.firstMessage,
        watchingTarget: firstSixty.watchingTarget,
        bootBeats: firstSixty.bootBeats,
      },
    });

    // Write the staggered first-60s boot beats so the per-worker page
    // animates in correctly even before the first economic tick.
    writeBootBeats({
      agentId: agent.id,
      spawnedAt: Date.now(),
      beats: firstSixty.bootBeats,
      offsetsMs: BOOT_BEAT_OFFSETS_MS,
    });

    return NextResponse.json({ ok: true, agent });
  } catch (e) {
    console.error("[deploy-preset]", e);
    return NextResponse.json(
      {
        error: "deploy_failed",
        message: e instanceof Error ? e.message : "unknown error",
      },
      { status: 500 },
    );
  }
}

/** Short suffix to disambiguate Sentinel / Sentinel #2 / Sentinel #3. */
function suffix(): string {
  return Math.random().toString(36).slice(2, 5).toUpperCase();
}
