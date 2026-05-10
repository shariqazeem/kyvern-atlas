/**
 * Client-safe UUID v4 shim.
 *
 * `crypto.randomUUID()` is available in modern browsers + Node, but
 * older Safari (<15.4) and some embedded WebViews lack it. This
 * helper falls back to a manual v4 implementation that uses the
 * Web Crypto API for randomness when available.
 *
 * Use this anywhere a Client Component needs a UUID — server code
 * should `import { randomUUID } from "crypto"` directly.
 */

export function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const buf = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
