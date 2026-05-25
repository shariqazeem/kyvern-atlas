import { NextRequest, NextResponse } from "next/server";
import { getSignal, recordSignalSubmission } from "@/lib/agents/store";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * POST /api/findings/[id]/submit  (Phase 3 — Frontier Grand Champion)
 *
 * Submit a Sentinel-drafted bounty application. Two receipts captured:
 *
 *   1. On-chain memo  — vault.pay() to merchant `kyvern.submission`
 *      with memo `kvn-submit: {finding_id}`. Counts toward daily cap.
 *      The chain decides this submission, like every other dollar.
 *   2. Email send     — when RESEND_API_KEY is set, send the draft to
 *      a Kyvern relay address (or, in production, the bounty poster's
 *      contact). Demo-safe stub returns null when the env is absent.
 *
 * Idempotent: a second submit on an already-submitted finding returns
 * the existing receipt rather than firing again.
 *
 * Body: ignored (the draft text + recipient are already on the
 * signal's evidence).
 * Returns: { ok, memoTx, emailId, alreadySubmitted? }
 */

const SUBMISSION_RELAY_EMAIL =
  process.env.KYVERN_SUBMISSION_RELAY ?? "submissions@kyvernlabs.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? null;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const signal = getSignal(params.id);
  if (!signal) {
    return NextResponse.json(
      { ok: false, reason: "finding not found" },
      { status: 404 },
    );
  }
  if (signal.kind !== "drafted_application") {
    return NextResponse.json(
      { ok: false, reason: "only drafted_application findings can be submitted" },
      { status: 400 },
    );
  }
  if (signal.submittedAt) {
    return NextResponse.json({
      ok: true,
      alreadySubmitted: true,
      memoTx: signal.submissionMemoTx,
      emailId: signal.submissionEmailId,
    });
  }

  const vault = getVault(signal.deviceId);
  if (!vault) {
    return NextResponse.json(
      { ok: false, reason: "device not found" },
      { status: 404 },
    );
  }

  // 1. On-chain memo — runs through the policy program like every
  //    other dollar. Even submission is chain-decided.
  const memo = `kvn-submit: ${signal.id.slice(0, 12)} · ${signal.subject.slice(0, 80)}`;
  const memoPay = await serverVaultPay({
    vaultId: signal.deviceId,
    merchant: "kyvern.submission",
    recipientPubkey: vault.ownerWallet,
    amountUsd: 0.001, // microtransaction — anchors the submission on-chain
    memo,
    trigger: "user",
    logEvent: {
      eventType: "spending_sent",
      counterparty: "📨 Kyvern Submission Relay",
      description: `Submitted "${signal.subject.slice(0, 60)}" via memo`,
    },
  });

  // 2. Email send (optional; gated on env).
  let emailId: string | null = null;
  if (RESEND_API_KEY) {
    try {
      const draft =
        signal.evidence.find((e) => e.toLowerCase().startsWith("draft")) ??
        signal.evidence.join("\n\n");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Kyvern <relay@kyvernlabs.com>",
          to: SUBMISSION_RELAY_EMAIL,
          subject: `[Kyvern Submission] ${signal.subject}`,
          text:
            `${draft}\n\n` +
            `— sent via Kyvern · finding ${signal.id} · ` +
            `device ${signal.deviceId} · memo tx ${memoPay.signature ?? "(unsettled)"}`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        emailId = data.id ?? null;
      }
    } catch {
      /* email failed — on-chain memo still records the submission */
    }
  }

  // 3. Record the receipt on the signal row.
  const memoTx = memoPay.success ? memoPay.signature ?? null : null;
  const recorded = recordSignalSubmission(signal.id, {
    memoTx,
    emailId,
  });

  return NextResponse.json({
    ok: !!memoTx || !!emailId,
    memoTx,
    emailId,
    blocked: memoPay.blocked
      ? { reason: memoPay.reason ?? "policy_blocked" }
      : null,
    recorded,
  });
}
