/**
 * Runs once when the Next.js server starts.
 * Node-only DNS tweak lives in `instrumentation.node.ts` so Edge never
 * sees `node:dns` (Turbopack would otherwise flag it).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
