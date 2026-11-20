// Export a play session from gonefishing.gg into a JSON file the tracker can import (Past sessions -> Import).
// Every catch by the given players in the time window, with position, depth and gold bonuses.
//
//   node scripts/export-session.mjs --players 98602,98600 --from 2026-11-20T04:30Z --to 2026-11-20T07:30Z \
//        --map "The Jungle" --title "Jungle run" --out ../sessions/2026-11-20-jungle.json
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const players = (arg("players") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const from = Date.parse(arg("from")), to = Date.parse(arg("to") ?? new Date().toISOString());
const onlyMap = arg("map"), out = arg("out"), title = arg("title");
if (!players.length || !from || !out) { console.error("need --players, --from and --out"); process.exit(1); }

const API = "https://gonefishing.gg/api/";
const UA = { "User-Agent": "GONE Fishing session tracker export (+https://github.com/El-Bad/gone-fishing-guide)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => { const r = await fetch(API + p, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${p}`); return r.json(); };
const JW_MULT = 1.25;
const COLORS = ["#3fb6a8", "#f59e0b", "#a855f7", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#eab308"];

const crew = [], catches = [];
for (const [i, pid] of players.entries()) {
  const prof = await get(`player/${pid}?include=recent`);
  crew.push({ pid, name: prof.player.playername, avatar: prof.player.avatar, color: COLORS[i % COLORS.length] });
  for (let page = 1; page <= 40; page++) {
    const r = await get(`player/${pid}/catches?page=${page}`);
    for (const c of r.catches) {
      const at = Date.parse(c.created_at);
      if (at >= from && at <= to && (!onlyMap || c.map === onlyMap))
        catches.push({ id: c.id, pid, fish: c.fishtype, weight: +c.weight, map: c.map, day: +c.daycaught || 0, bait: c.bait, score: c.baitscore, at });
    }
    const oldest = r.catches[r.catches.length - 1];
    if (!oldest || page >= r.totalPages || Date.parse(oldest.created_at) < from) break;
    await sleep(250);
  }
  console.log(`${prof.player.playername}: ${catches.filter((c) => c.pid === pid).length} catches`);
}
// details: position, depth, upgrade levels, gold bonuses (~4 requests/second)
for (const [i, c] of catches.entries()) {
  try {
    const d = (await get(`catch/${c.id}`)).catch;
    Object.assign(c, {
      x: d.x ?? undefined, y: d.y ?? undefined, depth: d.depth ?? undefined, line: d.linelevel, rod: d.rodlevel, sinker: d.sinkerlevel,
      mult: [d.fishwhisperer, d.hotspot, d.beerbonus, d.daybonus, d.goldenmult, d.doubloonmultiplier].reduce((a, x) => a * (Number(x) > 0 ? Number(x) : 1), 1) * (d.jw ? JW_MULT : 1),
    });
  } catch (e) { console.warn("detail failed", c.id, e.message); }
  if (i % 20 === 0) process.stdout.write(`details ${i}/${catches.length}\r`);
  await sleep(250);
}
catches.sort((a, b) => b.at - a.at);
const record = {
  kind: "gone-fishing-session", v: 1, id: String(Math.min(...catches.map((c) => c.at))),
  start: Math.min(...catches.map((c) => c.at)), end: Math.max(...catches.map((c) => c.at)), savedAt: Date.now(),
  title: title ?? undefined, maps: [...new Set(catches.map((c) => c.map))], crew, catches,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(record));
console.log(`\nwrote ${out}: ${catches.length} catches, ${crew.length} players, ${new Date(record.start).toISOString()} - ${new Date(record.end).toISOString()}`);
