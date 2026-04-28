import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/agents/store";
import { getTemplate } from "@/lib/agents/templates";
import { getVault, writeDeviceLog } from "@/lib/vault-store";
import type { AgentTemplate } from "@/lib/agents/types";
import { buildFirstSixtySeconds, BOOT_BEAT_OFFSETS_MS } from "@/lib/agents/first-messages";
import { writeBootBeats } from "@/lib/agents/status-updates";

/**
 * POST /api/agents/spawn
 *
 * Spawn a new agent on a device. Required body:
 *   {
 *     deviceId: string (vault id),
 *     template: 'scout'|'analyst'|'hunter'|'greeter'|'custom'|'atlas',
 *     name: string,
 *     emoji?: string,
 *     personalityPrompt?: string (overrides template default),
 *     jobPrompt: string,
 *     allowedTools?: string[] (overrides template recommended),
 *     frequencySeconds?: number (overrides template default)
 *   }
 *
 * Returns the new agent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      deviceId?: string;
      template?: string;
      name?: string;
      emoji?: string;
      personalityPrompt?: string;
      jobPrompt?: string;
      allowedTools?: string[];
      frequencySeconds?: number;
      isPublic?: boolean;
    };

    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    if (!body.template) {
      return NextResponse.json({ error: "template required" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if (!body.jobPrompt?.trim()) {
      return NextResponse.json({ error: "jobPrompt required" }, { status: 400 });
    }

    const vault = getVault(body.deviceId);
    if (!vault) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const template = getTemplate(body.template);
    if (!template) {
      return NextResponse.json({ error: "invalid template" }, { status: 400 });
    }

    const trimmedName = body.name.trim();
    const trimmedJob = body.jobPrompt.trim();
    const frequencySeconds = body.frequencySeconds ?? template.defaultFrequencySeconds;
    const templateId = body.template as AgentTemplate;

    // First-60s artifacts — hand-written, in-character. Persisted to
    // metadata so the detail page can render the typewriter bubble
    // without re-parsing on every poll.
    const firstSixty = buildFirstSixtySeconds({
      name: trimmedName,
      template: templateId,
      jobPrompt: trimmedJob,
      frequencySeconds,
    });

    const agent = createAgent({
      deviceId: body.deviceId,
      name: trimmedName,
      emoji: body.emoji?.trim() || template.emoji,
      personalityPrompt: body.personalityPrompt?.trim() || template.personalityPrompt,
      jobPrompt: trimmedJob,
      allowedTools: body.allowedTools ?? template.recommendedTools,
      template: templateId,
      frequencySeconds,
      isPublic: body.isPublic !== false,
      metadata: {
        firstMessage: firstSixty.firstMessage,
        watchingTarget: firstSixty.watchingTarget,
      },
    });

    // Schedule the 7-beat boot timeline. Each beat carries a future
    // created_at offset; the client polls /status-stream and unwraps
    // them as time passes.
    writeBootBeats({
      agentId: agent.id,
      spawnedAt: agent.createdAt,
      beats: firstSixty.bootBeats,
      offsetsMs: BOOT_BEAT_OFFSETS_MS,
    });

    // Log the spawn to device_log so it shows in the activity feed
    writeDeviceLog({
      deviceId: body.deviceId,
      eventType: "ability_installed",
      abilityId: `agent:${agent.id}`,
      description: `Spawned ${agent.emoji} ${agent.name} (${template.name})`,
      metadata: {
        agentId: agent.id,
        template: agent.template,
        tools: agent.allowedTools,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (e) {
    console.error("[agents/spawn]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
