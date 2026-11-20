/// <reference types="@cloudflare/workers-types" />
// Cloudflare Worker: serves the built app + field guide (static assets) and relays gonefishing.gg's public API
// under /gf-api/ (the API has no CORS headers, so browsers can't call it from another site).
// Read-only allow-list, edge-cached so many users don't multiply the load on gonefishing.gg.

interface Env { ASSETS: Fetcher }

const UPSTREAM = "https://gonefishing.gg/api/";
const UA = "GONE Fishing session tracker (+https://github.com/El-Bad/gone-fishing-guide)";
const ALLOW = /^(player\/|catch\/\d+$|liveview\/recent|seasons|challenges)/;

/** seconds to cache each kind of response at the edge */
function ttl(path: string): number {
  if (/^catch\/\d+$/.test(path)) return 7 * 86400;   // a catch never changes
  if (path.startsWith("player/search")) return 300;
  if (path.startsWith("seasons") || path.startsWith("challenges")) return 600;
  return 15;                                          // profiles, catch logs, recent feed
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/gf-api/")) return env.ASSETS.fetch(req);
    if (req.method !== "GET") return new Response("GET only", { status: 405 });

    const path = url.pathname.slice("/gf-api/".length);
    if (!ALLOW.test(path) || path.includes("..")) return new Response("Not an allowed API path", { status: 404 });
    const params = new URLSearchParams(url.search);
    params.delete("t"); // client cache-busters: ignore, so everyone shares the edge cache
    const qs = params.toString();
    const upstream = UPSTREAM + path + (qs ? `?${qs}` : "");

    // live catch stream (server-sent events): pass straight through, never cached
    if (path.startsWith("liveview/recent/stream")) {
      const up = await fetch(upstream, { headers: { "User-Agent": UA, Accept: "text/event-stream" } });
      return new Response(up.body, { status: up.status, headers: { "Content-Type": up.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-store" } });
    }

    const cache = caches.default;
    const key = new Request(upstream, { method: "GET" });
    const hit = await cache.match(key);
    if (hit) return hit;

    const up = await fetch(upstream, { headers: { "User-Agent": UA, Accept: "application/json" } });
    const res = new Response(up.body, { status: up.status, headers: { "Content-Type": up.headers.get("Content-Type") ?? "application/json" } });
    if (up.ok || (up.status === 404 && path.startsWith("catch/"))) {
      res.headers.set("Cache-Control", `public, max-age=${up.ok ? ttl(path) : 600}`);
      ctx.waitUntil(cache.put(key, res.clone()));
    } else {
      res.headers.set("Cache-Control", "no-store");
    }
    return res;
  },
};
