// Optional: a Cloudflare Worker that lets a hosted copy of the guide (e.g. GitHub Pages) read live
// gonefishing.gg profile data. The API sends no CORS headers, so browsers block direct calls.
// Deploy this worker, then paste its URL (ending in /) into the guide's Player tab -> "API proxy URL".
// Read-only allow-list, same as serve.py.
const UPSTREAM = "https://gonefishing.gg/api/";
const ALLOW = ["player/", "liveview/recent", "seasons", "challenges"];
const ORIGINS = ["https://el-bad.github.io", "http://127.0.0.1:8765"]; // pages allowed to use this proxy

export default {
  async fetch(req) {
    const origin = req.headers.get("Origin") || "";
    const cors = {"Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Vary": "Origin"};
    if (req.method === "OPTIONS") return new Response(null, {headers: {...cors, "Access-Control-Allow-Methods": "GET"}});
    if (req.method !== "GET") return new Response("GET only", {status: 405, headers: cors});
    const url = new URL(req.url), rest = url.pathname.replace(/^\/+/, "") + url.search;
    if (!ALLOW.some(p => rest.startsWith(p)) || rest.includes("..")) return new Response("Not allowed", {status: 403, headers: cors});
    const up = await fetch(UPSTREAM + rest, {headers: {"User-Agent": "GONE Fishing field guide proxy"}});
    const h = new Headers(cors);
    h.set("Content-Type", up.headers.get("Content-Type") || "application/json");
    h.set("Cache-Control", "no-store");
    return new Response(up.body, {status: up.status, headers: h}); // streams SSE through unchanged
  }
};
