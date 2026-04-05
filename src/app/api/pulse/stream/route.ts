import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if ("error" in auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let lastEventId = "";

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      const interval = setInterval(() => {
        try {
          const db = getDb();

          // Get latest events since last check (last 30 seconds max)
          const since =
            lastEventId ||
            new Date(Date.now() - 30000).toISOString();
          const newEvents = db
            .prepare(
              `
            SELECT id, timestamp, endpoint, amount_usd, payer_address, status, tx_hash, network, source
            FROM events
            WHERE api_key_id = ? AND timestamp > ?
            ORDER BY timestamp DESC LIMIT 10
          `
            )
            .all(auth.apiKeyId, since);

          if (newEvents.length > 0) {
            lastEventId = (newEvents[0] as Record<string, unknown>).timestamp as string;
            const data = JSON.stringify({
              events: newEvents,
              count: newEvents.length,
            });
            controller.enqueue(
              encoder.encode(`event: new-events\ndata: ${data}\n\n`)
            );
          }

          // Send heartbeat every interval to keep connection alive
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Ignore errors during polling
        }
      }, 5000); // Poll every 5 seconds

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
