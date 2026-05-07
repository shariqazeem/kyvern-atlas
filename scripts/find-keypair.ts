/**
 * Scan every 64-byte JSON keypair file on disk; report any whose pubkey
 * matches the deployed Kyvern policy program ID.
 *
 *   npx tsx scripts/find-keypair.ts
 */

import { Keypair } from "@solana/web3.js";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TARGET = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

const cmd = `find /Users/macbookair -type f -name "*.json" -size -2k \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.next/*" \
  -not -path "*/Library/*" \
  -not -path "*/.Trash/*" \
  2>/dev/null`;

// `find` may exit non-zero on permission-denied entries — that's fine,
// we still want the partial stdout it produced.
let stdout = "";
try {
  stdout = execSync(cmd, { maxBuffer: 200 * 1024 * 1024 }).toString();
} catch (e) {
  const err = e as { stdout?: Buffer };
  stdout = err.stdout?.toString() ?? "";
}
const candidates = stdout.split("\n").filter(Boolean);

console.log(`scanning ${candidates.length} json files...`);

let scanned = 0;
let matches = 0;

for (const path of candidates) {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    continue;
  }
  if (!Array.isArray(arr) || arr.length !== 64) continue;
  if (!arr.every((n) => typeof n === "number" && n >= 0 && n <= 255)) continue;
  scanned++;
  try {
    const kp = Keypair.fromSecretKey(Uint8Array.from(arr as number[]));
    const pk = kp.publicKey.toBase58();
    if (pk === TARGET) {
      console.log(`\nMATCH ✓ ${path}`);
      matches++;
    }
  } catch {
    /* not a valid keypair */
  }
}

console.log(`\nscanned ${scanned} valid 64-byte arrays · ${matches} match(es)`);
if (matches === 0) process.exit(1);
