/**
 * AES-GCM symmetric encryption for BYOK provider keys.
 *
 * The user pastes their Anthropic / OpenAI / DeepSeek / Commonstack
 * API key into the /app settings UI; we encrypt at rest with a
 * server-held secret and decrypt only at the moment we make a
 * provider call.
 *
 * Threat model: a DB dump (e.g. atlas.db leaked) shouldn't expose
 * usable keys. KYVERN_KEY_VAULT_SECRET lives in pm2 env vars (see
 * CLAUDE.md), not in the repo, so a code leak alone is also useless.
 *
 * Format on disk: a single base64-url string packing
 *   [12-byte iv | n-byte ciphertext | 16-byte auth tag]
 * No version prefix — if we ever rotate to a new format, add one
 * then. For now, simplicity wins.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Derive a 32-byte key from KYVERN_KEY_VAULT_SECRET via scrypt.
 *  Cached at module load — secret rotation requires a process restart. */
let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.KYVERN_KEY_VAULT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "KYVERN_KEY_VAULT_SECRET env var missing or too short (need ≥16 chars). " +
      "Set it in pm2 ecosystem so this process restart picks it up.",
    );
  }
  // Static salt is fine here — this isn't a password store, it's a
  // server-side derivation from a high-entropy secret. The point of
  // scrypt over plain SHA256 is just defense-in-depth on a weak secret.
  cachedKey = scryptSync(secret, "kyvern-byok-v1", 32);
  return cachedKey;
}

/** Encrypt a plaintext string. Returns base64-url packed envelope. */
export function encryptKey(plaintext: string): string {
  if (!plaintext) throw new Error("plaintext required");
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_LEN) throw new Error("unexpected auth tag length");
  return Buffer.concat([iv, ciphertext, tag]).toString("base64url");
}

/** Decrypt a previously-encrypted envelope. Throws on tamper or
 *  bad secret (so a key rotation surfaces immediately rather than
 *  returning garbage). */
export function decryptKey(envelope: string): string {
  const buf = Buffer.from(envelope, "base64url");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("encrypted envelope too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Last 4 chars of the plaintext key, for masked UI display
 *  ("sk-…aB12"). Stored in plain text on the row so we don't have to
 *  decrypt for list views. */
export function maskKeyLast4(plaintext: string): string {
  if (plaintext.length <= 4) return plaintext;
  return plaintext.slice(-4);
}
