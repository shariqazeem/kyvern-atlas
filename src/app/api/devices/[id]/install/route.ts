import { NextRequest, NextResponse } from "next/server";
import {
  writeDeviceLog,
  recordPublicAbility,
  getVault,
} from "@/lib/vault-store";

/**
 * POST /api/devices/[id]/install
 * Record an ability installation: writes to device_log + device_abilities_public.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const { abilityId, abilityName } = body;

    if (!abilityId || !abilityName) {
      return NextResponse.json({ error: "abilityId and abilityName required" }, { status: 400 });
    }

    const vault = getVault(params.id);
    if (!vault) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    // Write to device log
    const logEntry = writeDeviceLog({
      deviceId: params.id,
      eventType: "ability_installed",
      abilityId,
      description: `Installed ${abilityName}`,
    });

    // Mirror to public abilities table
    recordPublicAbility(params.id, abilityId);

    return NextResponse.json({ logged: true, entry: logEntry });
  } catch (e) {
    console.error("[devices/install]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
