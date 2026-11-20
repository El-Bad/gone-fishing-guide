import { useSyncExternalStore } from "react";
import { api, cacheReady, type ApiLogCatch, type ApiPlayer, type CatchDetail, type StreamCatch } from "./api";
import { evidence, sessionStartFrom, verdict, type Evidence, type Pt, type Verdict } from "./detect";
import { kvGet, kvSet } from "./store";

export interface Catch {
  id: number; pid: string; fish: string; weight: number; map: string; day: number; bait: string | null; score: number | null; at: number;
  sid?: string; // set on catches shown from a past session
  x?: number; y?: number; depth?: number; mult?: number; line?: number; rod?: number; sinker?: number; fresh?: number;
}
export interface Member {
  pid: string; name: string; color: string; status: "me" | "crew" | "ignored"; auto?: boolean;
  avatar?: string; inGame?: boolean; lastActive?: string; upgrades?: { line: number; rod: number; sinker: number }; player?: ApiPlayer;
}
export interface Candidate { pid: string; name: string; ev: Evidence; verdict: Verdict; verified: boolean; lastSeen: number }
/** a finished (or saved) play session: everything needed to show or compare it later */
export interface SessionRecord {
  kind: "gone-fishing-session"; v: 1; id: string; start: number; end: number; savedAt: number; title?: string;
  maps: string[]; crew: { pid: string; name: string; avatar?: string; color: string }[]; catches: Catch[];
}
export interface Scan { running: boolean; done: number; total: number; sameSpot: number; checked: number; cached?: boolean }
export interface State {
  meId: string; sessionStart: number; sessionMode: "auto" | "manual"; autoAdd: boolean;
  catches: Catch[]; members: Record<string, Member>; candidates: Record<string, Candidate>;
  status: "loading" | "live" | "reconnecting" | "error"; error?: string; restoredAt?: number; ratePerMin: number; myMap: string | null; myDay: number | null;
  scan: Scan;
  sessions: SessionRecord[]; compareId: string | null; includeIds: string[];
}

const COLORS = ["#f59e0b", "#a855f7", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#eab308", "#14b8a6"];
const ME_COLOR = "#3fb6a8";
const LS_KEY = "gfl-v1";
const HOUR = 3_600_000;

const fromLog = (pid: string, c: ApiLogCatch): Catch => ({
  id: c.id, pid, fish: c.fishtype, weight: +c.weight, map: c.map, day: +c.daycaught || 0, bait: c.bait, score: c.baitscore, at: Date.parse(c.created_at),
});
const fromStream = (c: StreamCatch): Catch => ({
  id: c.id, pid: String(c.profileId), fish: c.fishtype, weight: +c.weight, map: c.map, day: +c.daycaught || 0, bait: c.bait, score: c.baitscore,
  at: Date.parse(c.createdAt), line: c.linelevel, rod: c.rodlevel, sinker: c.sinkerlevel,
});
const pt = (c: Catch): Pt => ({ at: c.at, map: c.map, day: c.day });

class SessionStore {
  state: State;
  private listeners = new Set<() => void>();
  private es: EventSource | null = null;
  private mine = new Map<number, Pt>();                  // my catches (last ~12 h) for detection
  private others = new Map<string, { name: string; pts: Map<number, Pt> }>(); // non-crew players seen
  private verifying = new Set<string>();
  private checked = new Set<string>(); // players whose history we already pulled
  private posTimers = new Map<string, number>();
  private streamTimes: number[] = [];
  private maxId = 0;            // newest global catch id seen
  private scanGen = 0;          // cancels an older scan when a new one starts
  private scanHi = 0;           // newest catch id already covered by a history scan…
  private scanFor = 0;          // …for this session start
  private ruledOut = new Map<string, number>(); // player -> when their history showed they're not in my lobby
  private loggedFrom = new Map<string, number>(); // player -> oldest time their catch log has been fully fetched back to
  private saveT = 0;
  private started = false;
  private syncInterval = 0;
  private adopted = false;

  constructor(prev?: SessionStore) {
    let saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } })();
    // whose session? ?player=<profile id> in the URL wins, then the player picked last time; otherwise the app asks
    const fromUrl = new URLSearchParams(location.search).get("player")?.trim();
    if (fromUrl && /^\d+$/.test(fromUrl) && fromUrl !== saved?.meId) saved = { meId: fromUrl }; // someone else's link: fresh crew/settings
    const meId: string = saved?.meId ?? "";
    const members: Record<string, Member> = { [meId]: { pid: meId, name: "You", color: ME_COLOR, status: "me" } };
    for (const m of saved?.members ?? []) if (m.pid !== meId) members[m.pid] = { ...m };
    const candidates: Record<string, Candidate> = {};
    for (const c of saved?.candidates ?? []) candidates[c.pid] = { pid: c.pid, name: c.name, ev: { matches: 0, misses: 0, days: [], first: 0, last: 0 }, verdict: "no", verified: false, lastSeen: 0 };
    this.state = {
      meId, sessionStart: saved?.sessionMode === "manual" ? saved.sessionStart : 0, sessionMode: saved?.sessionMode ?? "auto",
      autoAdd: saved?.autoAdd ?? true, catches: [], members, candidates, status: "loading", ratePerMin: 0, myMap: null, myDay: null,
      scan: { running: false, done: 0, total: 0, sameSpot: 0, checked: 0 },
      sessions: [], compareId: null, includeIds: [],
    };
    if (prev) this.adopt(prev);
  }

  /** hot reload: take over the previous instance's data so the page keeps everything */
  private adopt(prev: SessionStore) {
    this.state = { ...prev.state, scan: { ...prev.state.scan, running: false } };
    this.mine = prev.mine; this.others = prev.others; this.checked = prev.checked; this.ruledOut = prev.ruledOut;
    this.maxId = prev.maxId; this.scanHi = prev.scanHi; this.scanFor = prev.scanFor; this.streamTimes = prev.streamTimes;
    this.adopted = prev.started;
    this.resumeScan = prev.state.scan.running;
  }
  private resumeScan = false;
  /** stop the old instance's network activity (its data lives on in the new instance) */
  dispose() {
    this.es?.close(); this.es = null;
    clearInterval(this.syncInterval);
    for (const t of this.posTimers.values()) clearTimeout(t);
    this.scanGen++;
    clearTimeout(this.saveT); this.saveT = 0;
    this.started = false; // stops its pagehide save and further scheduling
    this.saveSnapshot();
  }

  // ---- external store plumbing
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  get = () => this.state;
  private set(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((f) => f()); this.scheduleSave(); }
  private persist() {
    const s = this.state;
    localStorage.setItem(LS_KEY, JSON.stringify({
      meId: s.meId, sessionStart: s.sessionStart, sessionMode: s.sessionMode, autoAdd: s.autoAdd,
      members: Object.values(s.members).filter((m) => m.status !== "me").map(({ pid, name, color, status, auto }) => ({ pid, name, color, status, auto })),
      candidates: Object.values(s.candidates).filter((c) => c.verdict !== "no").map(({ pid, name }) => ({ pid, name })),
    }));
  }
  // ---- snapshot: everything needed to redraw instantly on the next visit (IndexedDB)
  private snapKey = () => `snap:${this.state.meId}`;
  /** throttled, not debounced: the live stream changes state every second, so a debounce would never fire */
  private scheduleSave() {
    if (!this.started || this.saveT) return;
    this.saveT = window.setTimeout(() => { this.saveT = 0; this.saveSnapshot(); }, 5000);
  }
  private saveSnapshot() {
    const s = this.state, keepFrom = s.sessionStart - HOUR;
    const info: Record<string, Partial<Member>> = {};
    for (const m of Object.values(s.members)) info[m.pid] = { name: m.name, avatar: m.avatar, inGame: m.inGame, lastActive: m.lastActive, upgrades: m.upgrades };
    void kvSet(this.snapKey(), {
      v: 1, savedAt: Date.now(), sessionStart: s.sessionStart, maxId: this.maxId,
      catches: s.catches.filter((c) => c.at >= keepFrom).map(({ fresh: _f, ...c }) => c),
      mine: [...this.mine.entries()].filter(([, p]) => p.at > Date.now() - 12 * HOUR).map(([id, p]) => [id, p.at, p.map, p.day]),
      members: info, scan: { hi: this.scanHi, forStart: this.scanFor, total: s.scan.total, sameSpot: s.scan.sameSpot },
      ruledOut: [...this.ruledOut.entries()].filter(([, at]) => Date.now() - at < 30 * 60_000),
      loggedFrom: [...this.loggedFrom.entries()],
    });
  }
  private restoredStart = 0;
  private async restoreSnapshot() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap: any = await kvGet(this.snapKey());
    if (!snap || snap.v !== 1) return;
    for (const [id, at, map, day] of snap.mine ?? []) this.mine.set(id, { at, map, day });
    this.maxId = snap.maxId ?? 0;
    this.restoredStart = snap.sessionStart ?? 0;
    this.scanHi = snap.scan?.hi ?? 0; this.scanFor = snap.scan?.forStart ?? 0;
    for (const [pid, at] of snap.ruledOut ?? []) { this.ruledOut.set(pid, at); this.checked.add(pid); }
    for (const [pid, at] of snap.loggedFrom ?? []) this.loggedFrom.set(pid, at);
    const members = { ...this.state.members };
    for (const [pid, inf] of Object.entries(snap.members ?? {})) if (members[pid]) members[pid] = { ...members[pid], ...(inf as Partial<Member>) };
    this.set({
      members, catches: (snap.catches ?? []).sort((a: Catch, b: Catch) => b.at - a.at), restoredAt: snap.savedAt,
      sessionStart: this.state.sessionMode === "manual" ? this.state.sessionStart : snap.sessionStart,
      scan: { running: false, done: snap.scan?.total ?? 0, total: snap.scan?.total ?? 0, sameSpot: snap.scan?.sameSpot ?? 0, checked: this.checked.size, cached: true },
    });
    this.updateMyState();
  }

  private crewIds = () => Object.values(this.state.members).filter((m) => m.status !== "ignored").map((m) => m.pid);
  private isCrew = (pid: string) => { const m = this.state.members[pid]; return !!m && m.status !== "ignored"; };

  // ---- lifecycle
  start() {
    if (this.started || !this.state.meId) return; // no player chosen yet: the picker is showing
    this.started = true;
    addEventListener("pagehide", () => { if (this.started) this.saveSnapshot(); }); // a store replaced by hot reload stays quiet
    if (this.adopted) { // hot reload: data is already here, just reconnect
      this.connect();
      this.syncInterval = window.setInterval(() => this.sync(), 90_000);
      if (this.resumeScan) this.scanHistory();
      return;
    }
    this.load().catch((e) => this.set({ status: "error", error: String(e?.message ?? e) }));
  }
  private async load() {
    const { meId } = this.state;
    await Promise.all([this.restoreSnapshot(), cacheReady, this.loadSessions()]); // draw from the last visit straight away
    const [me, myLog] = await Promise.all([api.player(meId), api.catchesSince(meId, Date.now() - 12 * HOUR, 12, (id) => this.mine.has(id))]);
    myLog.forEach((c) => this.mine.set(c.id, pt(fromLog(meId, c))));
    this.patchMember(meId, { name: me.player.playername, player: me.player, avatar: me.player.avatar, inGame: me.player.steamProfile?.isPlayingTarget, lastActive: me.player.lastactive });
    if (this.state.sessionMode === "auto") {
      const times = [...this.mine.values()].map((p) => p.at);
      const start = sessionStartFrom(times);
      const latest = times.length ? Math.max(...times) : 0;
      const live = start !== null && Date.now() - latest < 45 * 60_000;
      this.set({ sessionStart: live ? start! - 60_000 : Date.now() });
    }
    // the session from the last visit is over (a new one started): keep it in the session history
    if (this.restoredStart && this.state.sessionStart - this.restoredStart > 30 * 60_000) {
      await this.archive(this.restoredStart, this.state.sessionStart);
    }
    this.updateMyState();
    // session catches for me + saved crew
    await Promise.all(this.crewIds().map((pid) => this.backfill(pid)));
    this.applyRecent(meId, me.recentCatches);
    // seed detection from the last minute of global catches, then go live
    try { (await api.recentGlobal()).catches.forEach((c) => this.onCatch(c, false)); } catch { /* optional */ }
    for (const pid of Object.keys(this.state.candidates)) this.verify(pid);
    this.connect();
    this.syncInterval = window.setInterval(() => this.sync(), 90_000);
    this.fillDetails();
    this.scanHistory();
    this.persist();
  }
  private connect() {
    this.es?.close();
    const es = api.stream();
    this.es = es;
    let hadError = false;
    es.addEventListener("catch", (ev) => {
      try { const d = JSON.parse((ev as MessageEvent).data); if (d.catch) this.onCatch(d.catch, true); } catch { /* ignore bad frame */ }
    });
    es.onopen = () => { this.set({ status: "live", error: undefined }); if (hadError) { hadError = false; this.sync(); } };
    es.onerror = () => { hadError = true; this.set({ status: "reconnecting" }); };
  }
  /** periodic catch-up: anything the stream missed, plus fresh positions and in-game status */
  private async sync() {
    for (const pid of this.crewIds()) {
      try {
        const page = await api.catchesPage(pid, 1);
        this.addCatches(page.catches.map((c) => fromLog(pid, c)).filter((c) => c.at >= this.state.sessionStart));
        if (pid === this.state.meId) page.catches.forEach((c) => this.mine.set(c.id, pt(fromLog(pid, c))));
      } catch { /* try again next round */ }
      this.queuePositions(pid, 0);
    }
    this.updateMyState();
  }

  // ---- catches
  private onCatch(raw: StreamCatch, live: boolean) {
    const now = Date.now();
    if (live) { this.streamTimes.push(now); while (this.streamTimes.length && now - this.streamTimes[0] > 60_000) this.streamTimes.shift(); }
    const c = fromStream(raw);
    if (c.id > this.maxId) this.maxId = c.id;
    if (c.pid === this.state.meId) {
      this.mine.set(c.id, pt(c));
      this.updateMyState();
      this.rescoreAll();
    }
    if (this.isCrew(c.pid)) {
      if (c.at >= this.state.sessionStart) {
        if (live) c.fresh = now;
        this.addCatches([c]);
        this.patchMember(c.pid, { upgrades: { line: raw.linelevel, rod: raw.rodlevel, sinker: raw.sinkerlevel }, lastActive: raw.createdAt, ...(c.pid !== this.state.meId ? { name: raw.playername } : {}) });
        this.queuePositions(c.pid);
        this.fillDetails([c.id]);
      }
    } else if (this.state.members[c.pid]?.status !== "ignored") {
      this.track(c.pid, raw.playername, c);
    }
    if (live) this.set({ ratePerMin: this.streamTimes.length });
  }
  private addCatches(list: Catch[]) {
    if (!list.length) return;
    const byId = new Map(this.state.catches.map((c) => [c.id, c]));
    let changed = false;
    for (const c of list) {
      const old = byId.get(c.id);
      if (!old) { byId.set(c.id, c); changed = true; }
      else if (c.line != null && old.line == null) { byId.set(c.id, { ...old, line: c.line, rod: c.rod, sinker: c.sinker }); changed = true; }
    }
    if (changed) this.set({ catches: [...byId.values()].sort((a, b) => b.at - a.at) });
  }
  private async backfill(pid: string, full = false) {
    try {
      const since = this.state.sessionStart;
      // stopping at the first stored catch is only safe if an earlier fetch already reached back to the session start
      const covered = !full && (this.loggedFrom.get(pid) ?? Infinity) <= since;
      const have = new Set(this.state.catches.filter((c) => c.pid === pid).map((c) => c.id));
      const log = await api.catchesSince(pid, since, 40, covered ? (id) => have.has(id) : undefined);
      if (!covered) this.loggedFrom.set(pid, since);
      const list = log.map((c) => fromLog(pid, c)).filter((c) => c.at >= this.state.sessionStart);
      this.addCatches(list);
      this.queuePositions(pid, 0);
      this.fillDetails(list.map((c) => c.id));
    } catch (e) { console.warn("backfill failed", pid, e); }
  }
  private queuePositions(pid: string, delay = 3000) {
    clearTimeout(this.posTimers.get(pid));
    this.posTimers.set(pid, window.setTimeout(async () => {
      try {
        const r = await api.player(pid);
        this.applyRecent(pid, r.recentCatches);
        this.patchMember(pid, { player: r.player, avatar: r.player.avatar, inGame: r.player.steamProfile?.isPlayingTarget, lastActive: r.player.lastactive, name: pid === this.state.meId ? r.player.playername : r.player.playername || this.state.members[pid]?.name });
      } catch { /* positions are best-effort */ }
    }, delay));
  }
  private applyRecent(pid: string, recent: { id: number; x: number; y: number; fishtype: string; weight: number; map: string; bait: string | null; created_at: string }[]) {
    const pos = new Map(recent.filter((r) => r.x != null).map((r) => [r.id, r]));
    let changed = false;
    const catches = this.state.catches.map((c) => {
      const r = c.pid === pid && c.x == null ? pos.get(c.id) : undefined;
      if (!r) return c;
      changed = true;
      return { ...c, x: r.x, y: r.y };
    });
    if (changed) this.set({ catches });
  }
  private updateMyState() {
    let last: Pt | null = null;
    for (const p of this.mine.values()) if (!last || p.at > last.at) last = p;
    this.set({ myMap: last?.map ?? null, myDay: last?.day ?? null });
  }

  /** positions + depth for session catches (one cached lookup per catch; only the last 10 per player come for free) */
  private async fillDetails(ids?: number[]) {
    const want = ids ?? this.state.catches.filter((c) => c.x == null || c.depth == null || c.mult == null).map((c) => c.id);
    await Promise.all(want.map(async (id) => {
      const d = await api.catchDetail(id, true); // crew catches jump the queue ahead of the history scan
      if (d) this.patchCatch(d);
    }));
  }
  private patchCatch(d: CatchDetail) {
    const i = this.state.catches.findIndex((c) => c.id === d.id);
    if (i < 0) return;
    const c = this.state.catches[i];
    if (c.x != null && c.depth != null && c.mult != null) return;
    const catches = this.state.catches.slice();
    catches[i] = { ...c, x: d.x ?? c.x, y: d.y ?? c.y, depth: d.depth ?? undefined, mult: d.mult, line: c.line ?? d.line, rod: c.rod ?? d.rod, sinker: c.sinker ?? d.sinker };
    this.set({ catches });
  }

  /**
   * Look back through everyone's catches during this session for players on my map + day.
   * Catch ids are one global sequence, so the ids between my first and latest catch are "everything caught
   * in the game meanwhile". Sample them (every Nth id, plus a tight window around each of my catches);
   * anyone who matches my map + day gets their own history checked (verify), which settles crew vs stranger.
   */
  async scanHistory(force = false) {
    const gen = ++this.scanGen;
    const myIds = this.state.catches.filter((c) => c.pid === this.state.meId && c.at >= this.state.sessionStart).map((c) => c.id);
    if (!myIds.length) { this.set({ scan: { running: false, done: 0, total: 0, sameSpot: 0, checked: 0 } }); return; }
    const resume = !force && this.scanFor === this.state.sessionStart && this.scanHi > 0;
    const prev = resume ? this.state.scan : { total: 0, sameSpot: 0 };
    const lo = resume ? Math.max(Math.min(...myIds), this.scanHi + 1) : Math.min(...myIds), hi = Math.max(this.maxId, ...myIds);
    if (resume && lo > hi) { this.set({ scan: { ...this.state.scan, running: false } }); return; }
    const ids = new Set<number>();
    // stable sample grid: power-of-two stride, aligned to multiples of it, so repeat visits pick the same
    // (already cached) ids; when the session grows and the stride doubles, half the samples are still cached
    const stride = 2 ** Math.max(0, Math.ceil(Math.log2(Math.max(1, (hi - lo) / 320))));
    for (let id = Math.ceil(lo / stride) * stride; id <= hi; id += stride) ids.add(id);
    for (const m of myIds) if (m >= lo - 4) for (let k = -4; k <= 4; k++) ids.add(m + k);
    const todo = [...ids].filter((id) => !myIds.includes(id)).sort((a, b) => b - a); // newest first
    const seen = new Set<string>();
    let done = 0, sameSpot = 0;
    const report = (running: boolean) => this.set({ scan: { running, done: prev.total + done, total: prev.total + todo.length, sameSpot: prev.sameSpot + sameSpot, checked: this.checked.size } });
    report(true);
    await Promise.all(todo.map(async (id) => {
      const d = await api.catchDetail(id);
      if (gen !== this.scanGen) return;
      done++;
      if (d && d.pid !== this.state.meId) {
        if (this.isCrew(d.pid)) this.patchCatch(d);
        else if (this.state.members[d.pid]?.status !== "ignored") {
          const c: Catch = { id: d.id, pid: d.pid, fish: d.fish, weight: d.weight, map: d.map, day: d.day, bait: d.bait, score: d.score, at: d.at };
          if (d.map === this.state.myMap || [...this.mine.values()].some((p) => p.map === d.map && p.day === d.day)) {
            if (!seen.has(d.pid)) { seen.add(d.pid); sameSpot++; }
          }
          this.track(d.pid, d.name, c);
        }
      }
      if (done % 10 === 0 || done === todo.length) report(done < todo.length);
    }));
    if (gen === this.scanGen) { this.scanHi = hi; this.scanFor = this.state.sessionStart; report(false); this.saveSnapshot(); }
  }

  // ---- crew detection
  private track(pid: string, name: string, c: Catch) {
    let o = this.others.get(pid);
    if (!o) this.others.set(pid, (o = { name, pts: new Map() }));
    o.pts.set(c.id, pt(c));
    // forget players we haven't seen for an hour (keeps memory flat; ~50 catches/min game-wide)
    if (this.others.size > 1500) {
      const cutoff = this.state.sessionStart - HOUR;
      for (const [k, v] of this.others) if (Math.max(...[...v.pts.values()].map((p) => p.at)) < cutoff) this.others.delete(k);
    }
    this.rescore(pid);
  }
  private rescoreAll() { for (const pid of this.others.keys()) this.rescore(pid); }
  private rescore(pid: string) {
    const o = this.others.get(pid);
    if (!o || this.isCrew(pid)) return;
    const ev = evidence([...this.mine.values()], [...o.pts.values()], this.state.sessionStart - 30 * 60_000);
    const v = verdict(ev);
    const prev = this.state.candidates[pid];
    if (v === "no" && !prev) {
      // one catch on my map + day is enough to look at their history: crewmates show lockstep days at once
      if (ev.matches >= 1) this.verify(pid);
      return;
    }
    const cand: Candidate = { pid, name: o.name, ev, verdict: v, verified: prev?.verified || (this.checked.has(pid) && !this.verifying.has(pid)), lastSeen: Math.max(...[...o.pts.values()].map((p) => p.at)) };
    this.set({ candidates: { ...this.state.candidates, [pid]: cand } });
    if (v !== "no" && !cand.verified) this.verify(pid);
    if (v === "likely" && this.state.autoAdd && this.state.members[pid]?.status !== "ignored") this.addCrew(pid, o.name, true);
  }
  /** pull a candidate's own catch history and re-score with it: one lookup settles most cases */
  private async verify(pid: string) {
    if (this.verifying.has(pid) || this.checked.has(pid) || this.isCrew(pid)) return;
    const out = this.ruledOut.get(pid);
    if (out && Date.now() - out < 30 * 60_000) return; // checked recently (maybe on a previous visit)
    this.verifying.add(pid);
    this.checked.add(pid);
    try {
      const log = await api.catchesSince(pid, this.state.sessionStart - 30 * 60_000, 4);
      let o = this.others.get(pid);
      if (!o) this.others.set(pid, (o = { name: this.state.candidates[pid]?.name ?? `Player ${pid}`, pts: new Map() }));
      log.forEach((c) => o!.pts.set(c.id, pt(fromLog(pid, c))));
      const prev = this.state.candidates[pid];
      if (prev) this.set({ candidates: { ...this.state.candidates, [pid]: { ...prev, verified: true } } });
      this.verifying.delete(pid);
      this.rescore(pid);
      if (!this.isCrew(pid) && (this.state.candidates[pid]?.verdict ?? "no") === "no") this.ruledOut.set(pid, Date.now());
      this.persist();
    } catch { /* leave unverified */ } finally { this.verifying.delete(pid); }
  }

  // ---- members
  private patchMember(pid: string, patch: Partial<Member>) {
    const m = this.state.members[pid];
    if (!m) return;
    this.set({ members: { ...this.state.members, [pid]: { ...m, ...patch } } });
  }
  addCrew(pid: string, name: string, auto = false) {
    pid = String(pid);
    const existing = this.state.members[pid];
    if (existing?.status === "crew" || existing?.status === "me") return;
    const used = new Set(Object.values(this.state.members).map((m) => m.color));
    const color = existing?.color ?? COLORS.find((c) => !used.has(c)) ?? COLORS[Object.keys(this.state.members).length % COLORS.length];
    const { [pid]: _gone, ...candidates } = this.state.candidates;
    void _gone;
    this.set({ members: { ...this.state.members, [pid]: { pid, name, color, status: "crew", auto } }, candidates });
    this.others.delete(pid);
    this.persist();
    this.backfill(pid);
  }
  ignore(pid: string) {
    const m = this.state.members[pid];
    const name = m?.name ?? this.state.candidates[pid]?.name ?? pid;
    const { [pid]: _gone, ...candidates } = this.state.candidates;
    void _gone;
    this.set({
      members: { ...this.state.members, [pid]: { pid, name, color: m?.color ?? "#888", status: "ignored" } },
      candidates, catches: this.state.catches.filter((c) => c.pid !== pid),
    });
    this.persist();
  }
  unignore(pid: string) {
    const { [pid]: _gone, ...members } = this.state.members;
    void _gone;
    this.set({ members });
    this.persist();
  }
  /** re-fetch every crew member's whole log for this session (in case anything was missed) */
  async resync() {
    this.set({ status: this.state.status });
    await Promise.all(this.crewIds().map((pid) => this.backfill(pid, true)));
    this.fillDetails();
  }
  setAutoAdd(on: boolean) { this.set({ autoAdd: on }); this.persist(); }
  // ---- session history (IndexedDB, per player)
  private sessionsKey = () => `sessions:${this.state.meId}`;
  private async loadSessions() {
    const list = ((await kvGet<SessionRecord[]>(this.sessionsKey())) ?? []).sort((a, b) => b.start - a.start);
    this.set({ sessions: list });
  }
  private async storeSessions(list: SessionRecord[]) {
    list.sort((a, b) => b.start - a.start);
    this.set({ sessions: list });
    await kvSet(this.sessionsKey(), list);
  }
  /** save the session that ran from `start` (to before `until`) into the history; replaces an earlier save of it */
  async archive(start = this.state.sessionStart, until = Infinity, title?: string) {
    const crew = Object.values(this.state.members).filter((m) => m.status !== "ignored");
    const ids = new Set(crew.map((m) => m.pid));
    const catches = this.state.catches.filter((c) => ids.has(c.pid) && c.at >= start && c.at < until && !c.sid).map(({ fresh: _f, ...c }) => c);
    if (!catches.length) return null;
    const rec: SessionRecord = {
      kind: "gone-fishing-session", v: 1, id: String(start), start, end: Math.max(...catches.map((c) => c.at)), savedAt: Date.now(),
      title: title ?? this.state.sessions.find((r) => r.id === String(start))?.title,
      maps: [...new Set(catches.map((c) => c.map))],
      crew: crew.filter((m) => catches.some((c) => c.pid === m.pid)).map((m) => ({ pid: m.pid, name: m.name, avatar: m.avatar, color: m.color })),
      catches,
    };
    await this.storeSessions([...this.state.sessions.filter((r) => r.id !== rec.id), rec]);
    return rec;
  }
  async importSession(rec: SessionRecord) {
    if (rec?.kind !== "gone-fishing-session" || !Array.isArray(rec.catches)) throw new Error("Not a GONE Fishing session file");
    await this.storeSessions([...this.state.sessions.filter((r) => r.id !== rec.id), rec]);
  }
  async deleteSession(id: string) {
    this.set({ compareId: this.state.compareId === id ? null : this.state.compareId, includeIds: this.state.includeIds.filter((x) => x !== id) });
    await this.storeSessions(this.state.sessions.filter((r) => r.id !== id));
  }
  async renameSession(id: string, title: string) {
    await this.storeSessions(this.state.sessions.map((r) => (r.id === id ? { ...r, title: title || undefined } : r)));
  }
  setCompare(id: string | null) { this.set({ compareId: id }); }
  toggleInclude(id: string) {
    const on = this.state.includeIds.includes(id);
    this.set({ includeIds: on ? this.state.includeIds.filter((x) => x !== id) : [...this.state.includeIds, id] });
  }

  async newSession(mode: "manual" | "auto") {
    await this.archive(); // keep the session that's ending
    const at = mode === "manual" ? Date.now() : sessionStartFrom([...this.mine.values()].map((p) => p.at)) ?? Date.now();
    this.set({ sessionMode: mode, sessionStart: mode === "manual" ? at : at - 60_000, catches: [] });
    this.persist();
    Promise.all(this.crewIds().map((pid) => this.backfill(pid))).then(() => this.scanHistory());
  }
  /** switch to another player's session (keeps a shareable ?player= link) */
  setMe(pid: string) {
    localStorage.setItem(LS_KEY, JSON.stringify({ meId: String(pid) }));
    location.assign(`${location.pathname}?player=${encodeURIComponent(pid)}`);
  }
}

// Hot reload: Vite keeps import.meta.hot.data per module path. The previous store parks itself there; the
// replacement stops it (closing its stream and timers) and takes over all of its data, so the page keeps going.
const previous = import.meta.hot?.data.session as SessionStore | undefined;
previous?.dispose();
export const session = new SessionStore(previous);
if (import.meta.hot) import.meta.hot.data.session = session;
if (import.meta.env.DEV) (window as unknown as { __gfl: SessionStore }).__gfl = session; // for debugging in devtools
export const useSession = () => useSyncExternalStore(session.subscribe, session.get);
