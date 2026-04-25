import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/agents/store";
import { getTemplate } from "@/lib/agents/templates";
import { getVault, writeDeviceLog } from "@/lib/vault-store";
import type { AgentTemplate } from "@/lib/agents/types";

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

    const agent = createAgent({
      deviceId: body.deviceId,
      name: body.name.trim(),
      emoji: body.emoji?.trim() || template.emoji,
      personalityPrompt: body.personalityPrompt?.trim() || template.personalityPrompt,
      jobPrompt: body.jobPrompt.trim(),
      allowedTools: body.allowedTools ?? template.recommendedTools,
      template: body.template as AgentTemplate,
      frequencySeconds: body.frequencySeconds ?? template.defaultFrequencySeconds,
      isPublic: body.isPublic !== false,
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
