import { loadAll, prune, putMany } from "./store";
import { JW_MULT } from "./value";
// Thin typed client for gonefishing.gg's public API, via the Vite dev proxy (/gf-api -> /api).
const BASE = "/gf-api/";

export interface ApiPlayer {
  profile_id: string; playername: string; persona?: string; avatar?: string;
  totalcatches: string; catcheslast24h: string; lastactive: string; lastmap: string | null;
  bestfishname?: string; bestfishweight?: number; rank?: string; percentile?: number; rank_title?: string;
  xpStats?: { currentXP: number; rank_title: string; minXP: number; requiredXP: number; xpLeftToRankup: number };
  steamProfile?: { isPlayingTarget?: boolean; avatar?: string };
}
export interface ApiRecent { id: number; fishtype: string; weight: number; map: string; bait: string | null; x: number; y: number; created_at: string }
export interface ApiLogCatch { id: number; fishtype: string; weight: number; map: string; created_at: string; daycaught: string; bait: string | null; baitscore: number | null; weight_rank?: number }
export interface StreamCatch {
  id: number; playername: string; profileId: number; fishtype: string; weight: number; map: string; createdAt: string;
  daycaught: string; bait: string | null; baitscore: number | null; linelevel: number; rodlevel: number; sinkerlevel: number;
}

export interface CatchDetail {
  id: number; pid: string; name: string; fish: string; weight: number; map: string; day: number; at: number;
  x: number | null; y: number | null; depth: number | null; bait: string | null; score: number | null;
  line: number; rod: number; sinker: number; bonus: { whisperer: number; beer: number; day: number; hotspot: number; cave: number; golden: number; doubloon: number; jw: boolean };
  /** product of the bonuses that scale trader gold */
  mult: number;
}

// ---- polite request queue for per-catch lookups: max 3 in flight, ~8 requests/second
const QUEUE: (() => void)[] = [];
let inFlight = 0, lastStart = 0;
function pump() {
  while (inFlight < 3 && QUEUE.length) {
    const wait = lastStart + 125 - Date.now();
    if (wait > 0) { setTimeout(pump, wait); return; }
    lastStart = Date.now(); inFlight++; QUEUE.shift()!();
  }
}
const throttled = <T,>(fn: () => Promise<T>, urgent = false) => new Promise<T>((res, rej) => {
  QUEUE[urgent ? "unshift" : "push"](() => fn().then(res, rej).finally(() => { inFlight--; pump(); }));
  pump();
});

// ---- catch detail cache: IndexedDB (catches never change, so entries are kept until pruned)
const CACHE_MAX = 40000;
const cache = new Map<number, CatchDetail | null>();
const unsaved = new Map<number, CatchDetail | null>();
/** resolves once the cache has been loaded from IndexedDB (and the old localStorage cache migrated) */
export const cacheReady: Promise<void> = (async () => {
  for (const [k, v] of await loadAll<CatchDetail | null>("details")) cache.set(k, v);
  for (const old of ["gfl-catches-v1", "gfl-catches-v2"]) {
    const raw = localStorage.getItem(old);
    if (!raw) continue;
    try {
      if (old === "gfl-catches-v2") for (const [k, v] of JSON.parse(raw) as [number, CatchDetail | null][]) if (!cache.has(k)) { cache.set(k, v); unsaved.set(k, v); }
    } catch { /* ignore */ }
    localStorage.removeItem(old);
  }
  flush();
})();
// write new entries at most every 2 s (throttled: during a scan lookups arrive ~8/s, so a debounce would never fire)
let flushT = 0;
async function writeNow() {
  flushT = 0;
  const rows = [...unsaved.entries()];
  unsaved.clear();
  await putMany("details", rows);
  if (cache.size > CACHE_MAX * 1.1) await prune("details", CACHE_MAX);
}
function flush() {
  if (!flushT) flushT = window.setTimeout(writeNow, 2000);
}
addEventListener("pagehide", () => { if (unsaved.size) void writeNow(); });
const remember = (id: number, d: CatchDetail | null) => { cache.set(id, d); unsaved.set(id, d); flush(); };
export const cachedDetail = (id: number) => cache.get(id);
const pending = new Map<number, Promise<CatchDetail | null>>();
async function detailOf(id: number, urgent = false): Promise<CatchDetail | null> {
  await cacheReady;
  if (cache.has(id)) return cache.get(id)!;
  if (pending.has(id)) return pending.get(id)!;
  const p = throttled(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = (await get<{ catch: unknown }>(`catch/${id}`)).catch;
      const d: CatchDetail = {
        id: c.id, pid: String(c.profile_id), name: c.playername, fish: c.fishtype, weight: +c.weight, map: c.map, day: +c.daycaught || 0, at: Date.parse(c.created_at),
        x: c.x ?? null, y: c.y ?? null, depth: c.depth ?? null, bait: c.bait, score: c.baitscore, line: c.linelevel, rod: c.rodlevel, sinker: c.sinkerlevel,
        bonus: { whisperer: c.fishwhisperer, beer: c.beerbonus, day: c.daybonus, hotspot: c.hotspot, cave: c.cavebonus, golden: c.goldenmult, doubloon: c.doubloonmultiplier, jw: !!c.jw },
        mult: [c.fishwhisperer, c.hotspot, c.beerbonus, c.daybonus, c.goldenmult, c.doubloonmultiplier].reduce((a: number, x: unknown) => a * (Number(x) > 0 ? Number(x) : 1), 1) * (c.jw ? JW_MULT : 1),
      };
      remember(id, d);
      return d;
    } catch (e) {
      if (String(e).includes("404")) remember(id, null); // id gap (deleted/cheated entry)
      return null;
    } finally { pending.delete(id); }
  }, urgent);
  pending.set(id, p);
  return p;
}

async function get<T>(path: string, timeoutMs = 15000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + path, { cache: "no-store", signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} on ${path.split("?")[0]}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  player: (id: string) => get<{ player: ApiPlayer; recentCatches: ApiRecent[] }>(`player/${encodeURIComponent(id)}?include=recent&t=${Date.now()}`),
  catchesPage: (id: string, page: number) =>
    get<{ catches: ApiLogCatch[]; totalPages: number }>(`player/${encodeURIComponent(id)}/catches?page=${page}`),
  /** catch log newest-first, stopping once older than `since` (ms) or once it reaches a catch we already have */
  async catchesSince(id: string, since: number, maxPages = 12, known?: (catchId: number) => boolean): Promise<ApiLogCatch[]> {
    const out: ApiLogCatch[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const r = await api.catchesPage(id, page);
      out.push(...r.catches);
      const oldest = r.catches[r.catches.length - 1];
      if (!oldest || page >= r.totalPages || Date.parse(oldest.created_at) < since) break;
      if (known && r.catches.some((c) => known(c.id))) break; // everything older is already stored
    }
    return out;
  },
  /** full details of one catch (any player): position, depth, bonuses. Throttled + cached (catches never change). */
  catchDetail: (id: number, urgent = false) => detailOf(id, urgent),
  recentGlobal: () => get<{ catches: StreamCatch[] }>(`liveview/recent?limit=200`),
  search: (q: string) =>
    get<{ suggestions: { profileId: string; playerName: string; label?: string }[] }>(`player/search?q=${encodeURIComponent(q)}`),
  stream: () => new EventSource(BASE + "liveview/recent/stream"),
};
