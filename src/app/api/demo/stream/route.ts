import { NextRequest } from "next/server";
import { subscribe, getSession, type DemoEvent } from "@/lib/demo-session";

/* ════════════════════════════════════════════════════════════════════
   GET /api/demo/stream?session=ds_…

   Server-Sent Events feed for a demo session. On connect:
     1. Replays any events already buffered (so a late-joining browser
        sees the narrative from the start).
     2. Attaches a listener that forwards every new event.

   Events are sent with `event: <name>` + JSON `data`. The browser
   side uses an EventSource and an "event" handler per name — see
   /src/app/demo/demo-client.tsx.

   A heartbeat ( `: keepalive\n\n` ) fires every 20s so corporate
   proxies and Vercel's idle timeout don't kill the stream.
   ════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeSseEvent(ev: DemoEvent): string {
  return (
    `id: ${ev.seq}\n` +
    `event: ${ev.name}\n` +
    `data: ${JSON.stringify({ seq: ev.seq, t: ev.t, ...(ev.data as object) })}\n\n`
  );
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");
  if (!sessionId) {
    return new Response("missing session id", { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response("unknown session", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (bytes: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(bytes);
        } catch {
          closed = true;
        }
      };

      // Initial "connected" frame so the client has something to ACK.
      safeEnqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            sessionId,
            status: session.status,
            vaultId: session.vaultId,
          })}\n\n`,
        ),
      );

      const sub = subscribe(sessionId, (ev) => {
        safeEnqueue(encoder.encode(encodeSseEvent(ev)));
      });
      if (!sub) {
        controller.close();
        return;
      }

      // Replay buffered history first.
      for (const ev of sub.history) {
        safeEnqueue(encoder.encode(encodeSseEvent(ev)));
      }

      // Heartbeats.
      const hb = setInterval(() => {
        safeEnqueue(encoder.encode(`: keepalive\n\n`));
      }, 20_000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        sub.unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", close);
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
