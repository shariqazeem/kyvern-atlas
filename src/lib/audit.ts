import { nanoid } from "nanoid";
import { getDb } from "./db";

export function logAuditEvent(
  apiKeyId: string,
  action: string,
  details?: string,
  ipAddress?: string
) {
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        api_key_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `);
    db.prepare(
      "INSERT INTO audit_log (id, api_key_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)"
    ).run(nanoid(), apiKeyId, action, details || null, ipAddress || null);
  } catch {
    // Audit logging should never break the main flow
  }
}
