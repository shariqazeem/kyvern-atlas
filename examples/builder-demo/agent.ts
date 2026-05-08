/**
 * Demo agent — what a builder has BEFORE Kyvern.
 *
 * Open this file in your editor on the right side of the screen during
 * recording. The "before" shape is intentional: a small AI agent with
 * its own API key that spends however much it wants, no limits. The
 * narrator points at the OpenAI key + raw fetch and says "the agent
 * has my key — it can drain my OpenAI account if it goes off the rails."
 *
 * Then on the left side: open /app → "Use the device" → SDK pane →
 * Copy. Paste over `chatWithoutLimits` below. The wrap takes 5 lines.
 *
 * After the paste, save the file, run `npx tsx agent.ts`, and the
 * terminal prints a real Solana Explorer link. The chain just decided
 * a dollar.
 */

import OpenAI from "openai";

// ─── BEFORE: agent has the key, spends however much it wants ────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function chatWithoutLimits(prompt: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message.content ?? "";
}

// ─── AFTER (paste this from /app · Use the device · SDK pane) ───────
//
// import { Vault } from "@kyvernlabs/sdk";
//
// const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
//
// async function chatWithBudget(prompt: string, budgetUsd = 0.05) {
//   // Chain decides every dollar BEFORE OpenAI sees the request.
//   const pay = await vault.pay({
//     merchant: "api.openai.com",
//     recipientPubkey: "GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ",
//     amount: budgetUsd,
//     memo: prompt.slice(0, 64),
//   });
//   if (pay.decision !== "allowed") {
//     throw new Error(`chain refused: ${pay.code} — ${pay.reason}`);
//   }
//
//   // Settled. Now the actual model call goes through.
//   const res = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });
//   console.log("on-chain receipt:", pay.tx.explorerUrl);
//   return res.choices[0].message.content ?? "";
// }

// ─── Run ────────────────────────────────────────────────────────────

const answer = await chatWithoutLimits("What's the weather in Lahore?");
console.log("answer:", answer);
