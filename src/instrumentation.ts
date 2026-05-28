/**
 * Next.js instrumentation hook — runs once per server process at boot.
 * Documented at https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * We use it for one thing: pre-warm the Atlas snapshot cache so the
 * first observatory poll after a pm2 restart hits a warm 1 s cache
 * instead of paying the cold SQLite open + several reads. Without
 * this, the first 1–2 polls after every deploy land cold, which the
 * observatory's 3 s poll cadence makes user-visible.
 *
 * Wrapped in setImmediate so any boot failure here can't block server
 * startup. Wrapped in try/catch so if atlas.db isn't mounted (e.g.
 * during a local preview), the server still starts.
 */

export async function register(): Promise<void> {
  // Only run in the Node.js runtime (not edge). The edge bundle can't
  // resolve better-sqlite3's `fs` / `path` deps, so the import must be
  // gated behind a runtime check the bundler can statically see.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  setImmediate(async () => {
    try {
      // Lazy import so webpack-for-edge never tries to resolve the
      // SQLite module chain. The /* webpackIgnore: true */ marker
      // skips bundling entirely — we hit Node's runtime require()
      // path instead.
      const mod = await import(
        /* webpackIgnore: true */ "./lib/atlas/db.js"
      );
      mod.prewarmAtlasCache?.();
    } catch {
      /* atlas.db not ready yet — cache fills on first real request */
    }
  });
}
