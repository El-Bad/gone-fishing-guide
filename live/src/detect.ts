// Crew detection. The API has no lobby/session id, but a lobby shares its map and its in-game day.
// Someone in your lobby catches on your map + day, and their day ticks over when yours does.
// Strangers can share a map+day for a while, but rarely stay in lockstep across a day change.

export interface Pt { at: number; map: string; day: number }
export interface Evidence { matches: number; misses: number; days: number[]; first: number; last: number }
export type Verdict = "likely" | "possible" | "no";

const WINDOW = 20 * 60_000; // only compare against my catches within 20 min

/** Does a catch at `p` fit my map+day at that time? null = I have no nearby catches to compare with. */
export function fitsMyState(mine: Pt[], p: Pt, windowMs = WINDOW): boolean | null {
  let prev: Pt | undefined, next: Pt | undefined;
  for (const m of mine) {
    if (m.at <= p.at) { if (!prev || m.at > prev.at) prev = m; }
    else if (!next || m.at < next.at) next = m;
  }
  const near = [prev, next].filter((m): m is Pt => !!m && Math.abs(m.at - p.at) <= windowMs);
  if (!near.length) return null;
  return near.some((m) => m.map === p.map && m.day === p.day);
}

export function evidence(mine: Pt[], theirs: Pt[], since = 0): Evidence {
  const e: Evidence = { matches: 0, misses: 0, days: [], first: 0, last: 0 };
  const days = new Set<number>();
  for (const p of theirs) {
    if (p.at < since) continue;
    const fit = fitsMyState(mine, p);
    if (fit === null) continue;
    if (fit) {
      e.matches++; days.add(p.day);
      e.first = e.first ? Math.min(e.first, p.at) : p.at; e.last = Math.max(e.last, p.at);
    } else e.misses++;
  }
  e.days = [...days].sort((a, b) => a - b);
  return e;
}

export function merge(a: Evidence, b: Evidence): Evidence {
  const days = [...new Set([...a.days, ...b.days])].sort((x, y) => x - y);
  return { matches: a.matches + b.matches, misses: a.misses + b.misses, days, first: Math.min(a.first || Infinity, b.first || Infinity) || 0, last: Math.max(a.last, b.last) };
}

export function verdict(e: Evidence): Verdict {
  const total = e.matches + e.misses;
  const ratio = total ? e.matches / total : 0;
  if (e.matches >= 4 && e.days.length >= 2 && ratio >= 0.85) return "likely"; // stayed with me through a day change
  if (e.matches >= 2 && ratio >= 0.7) return "possible";
  return "no";
}

export const describe = (e: Evidence) =>
  `${e.matches} catch${e.matches === 1 ? "" : "es"} on your map and day${e.days.length ? ` (day ${e.days.length > 1 ? `${e.days[0]}–${e.days[e.days.length - 1]}` : e.days[0]})` : ""}` +
  (e.misses ? `, ${e.misses} elsewhere` : "");

/** Session start: first catch after the most recent break of >= gapMs (catches newest-first or any order). */
export function sessionStartFrom(times: number[], gapMs = 45 * 60_000): number | null {
  const t = [...times].sort((a, b) => b - a);
  if (!t.length) return null;
  let start = t[0];
  for (let i = 1; i < t.length; i++) {
    if (start - t[i] > gapMs) break;
    start = t[i];
  }
  return start;
}
