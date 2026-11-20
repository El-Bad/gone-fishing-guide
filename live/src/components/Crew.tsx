import { useRef, useState } from "react";

type SortKey = "fish" | "weight" | "value";
const SORTS: [SortKey, string][] = [["fish", "Fish"], ["weight", "Weight"], ["value", "Value"]];
import { api } from "../api";
import { describe } from "../detect";
import { FISH } from "../gameData";
import { session, type Catch, type Member, type State } from "../session";
import { ago, fmt, lb } from "../util";
import { sumGold } from "../value";

interface Props { s: State; catches: Catch[]; now: number; selected: string | null; onSelect: (pid: string | null) => void }

/** Who's playing + per-player stats, one card per crew member. */
export function Crew({ s, catches, now, selected, onSelect }: Props) {
  const members = Object.values(s.members);
  const crew = members.filter((m) => m.status !== "ignored");
  const ignored = members.filter((m) => m.status === "ignored");
  const cands = Object.values(s.candidates).filter((c) => c.verdict !== "no").sort((a, b) => b.ev.matches - a.ev.matches);
  const byPid = new Map<string, Catch[]>();
  catches.forEach((c) => byPid.set(c.pid, [...(byPid.get(c.pid) ?? []), c]));
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem("gfl-sort") as SortKey) || "value");
  const setSortSaved = (k: SortKey) => { setSort(k); localStorage.setItem("gfl-sort", k); };
  const metric = (cs: Catch[]) => (sort === "fish" ? cs.length : sort === "weight" ? cs.reduce((a, c) => a + c.weight, 0) : sumGold(cs));
  const rows = crew.map((m) => ({ m, cs: byPid.get(m.pid) ?? [] })).map((r) => ({ ...r, v: metric(r.cs) })).sort((a, b) => b.v - a.v);
  const total = Math.max(1e-9, rows.reduce((a, r) => a + r.v, 0));

  return (
    <div className="panel crewpanel">
      <div className="ph2">
        <h2>Players</h2>
        <div className="seg sm" role="group" aria-label="Sort players by">
          {SORTS.map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => setSortSaved(k)}>{l}</button>)}
        </div>
      </div>
      {selected && <button className="link showall" onClick={() => onSelect(null)}>show everyone</button>}
      <div className="crew">
        {rows.map(({ m, cs, v }, i) => <PlayerCard key={m.pid} rank={i + 1} sort={sort} share={v / total} m={m} cs={cs} now={now} selected={selected === m.pid} dim={!!selected && selected !== m.pid} onClick={() => onSelect(selected === m.pid ? null : m.pid)} />)}
      </div>

      {cands.length > 0 && (
        <>
          <h3 className="eyebrow">Maybe in your lobby</h3>
          {cands.map((c) => (
            <div key={c.pid} className="cand">
              <div>
                <b>{c.name}</b> <span className={`tag ${c.verdict}`}>{c.verdict === "likely" ? "likely" : "possible"}</span>
                <div className="sub">{describe(c.ev)}{c.verified ? "" : " · checking history…"}</div>
              </div>
              <button className="btn" onClick={() => session.addCrew(c.pid, c.name)}>Add</button>
              <button className="btn ghost" onClick={() => session.ignore(c.pid)}>Not them</button>
            </div>
          ))}
        </>
      )}
      {!cands.length && crew.length === 1 && (
        <p className="hint">Watching for players on your map and in-game day ({s.myMap?.replace(/^The /, "") ?? "waiting for your first catch"}{s.myDay ? `, day ${s.myDay}` : ""}).</p>
      )}

      <div className="scan">
        {s.scan.running
          ? <><span className="sbar"><i style={{ width: `${s.scan.total ? (s.scan.done / s.scan.total) * 100 : 0}%` }} /></span>
              <span className="sub">Looking back through this session: {s.scan.done}/{s.scan.total} catches · {s.scan.sameSpot} players on your map · {s.scan.checked} histories checked</span></>
          : s.scan.total > 0
            ? <span className="sub">Checked {s.scan.total} catches from this session ({s.scan.sameSpot} players on your map, {s.scan.checked} histories compared). <button className="link" onClick={() => session.scanHistory(true)}>Scan again</button> · <button className="link" onClick={() => session.resync()} title="Re-download every crew member's full catch log for this session">Resync catches</button></span>
            : <span className="sub">History scan starts once you've caught a fish this session.</span>}
      </div>
      <AddPlayer />
      <label className="check"><input type="checkbox" checked={s.autoAdd} onChange={(e) => session.setAutoAdd(e.target.checked)} /> Add likely crewmates automatically</label>
      {ignored.length > 0 && (
        <details className="ign"><summary>{ignored.length} ignored</summary>
          {ignored.map((m) => <div key={m.pid} className="sub">{m.name} <button className="link" onClick={() => session.unignore(m.pid)}>undo</button></div>)}
        </details>
      )}
    </div>
  );
}

function PlayerCard({ m, cs, rank, sort, share, now, selected, dim, onClick }: { m: Member; cs: Catch[]; rank: number; sort: SortKey; share: number; now: number; selected: boolean; dim: boolean; onClick: () => void }) {
  const gold = sumGold(cs);
  const playing = m.inGame || (m.lastActive != null && now - Date.parse(m.lastActive) < 10 * 60_000);
  const weight = cs.reduce((a, c) => a + c.weight, 0);
  const best = cs.reduce<Catch | null>((a, c) => (!a || c.weight > a.weight ? c : a), null);
  const species = new Set(cs.map((c) => c.fish)).size;
  const big = cs.filter((c) => FISH[c.fish]?.tier === "l").length;
  const scores = cs.map((c) => c.score).filter((x): x is number => x != null);
  const depths = cs.map((c) => c.depth).filter((x): x is number => x != null);
  const baits = new Map<string, number>();
  cs.forEach((c) => c.bait && baits.set(c.bait, (baits.get(c.bait) ?? 0) + 1));
  const topBait = [...baits.entries()].sort((a, b) => b[1] - a[1])[0];
  const latest = cs[0];
  const up = m.upgrades ?? (latest?.line != null ? { line: latest.line, rod: latest.rod!, sinker: latest.sinker! } : null);

  return (
    <div className={`pcard${selected ? " sel" : ""}${dim ? " dim" : ""}`} style={{ borderLeftColor: m.color }} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())} title="Show only this player's catches">
      <div className="phead">
        {m.avatar ? <img src={m.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="ph" style={{ background: m.color }} />}
        <div className="who">
          <b>{m.name}</b>
          {m.status === "me" ? <span className="tag me">you</span> : m.auto ? <span className="tag">auto</span> : <span className="tag">added</span>}
          <div className="sub">
            <span className={`dot${playing ? " on" : ""}`} title={m.inGame ? "Steam says they're in GONE Fishing" : playing ? "Caught a fish in the last 10 minutes" : ""} />
            {playing ? "playing" : "idle"} · last catch {ago(m.lastActive ?? latest?.at, now)}
          </div>
        </div>
        <div className="num">
          <b>{sort === "fish" ? cs.length : sort === "weight" ? fmt(cs.reduce((a, c) => a + c.weight, 0), 0) : `≈${fmt(gold, 0)}`}</b>
          <small>{sort === "fish" ? "fish" : sort === "weight" ? "lb" : "gold"} · #{rank}</small>
        </div>
        {m.status !== "me" && <button className="x" title="Not in my lobby: stop tracking" onClick={(e) => { e.stopPropagation(); session.ignore(m.pid); }}>×</button>}
      </div>
      <span className="share" title={`${Math.round(share * 100)}% of the group's ${sort === "fish" ? "fish" : sort}`}><i style={{ width: `${share * 100}%`, background: m.color }} /></span>
      <dl className="pstats">
        <div><dt>Fish</dt><dd>{cs.length}</dd></div>
        <div><dt>Weight</dt><dd>{lb(weight)}</dd></div>
        <div title="Trader gold before cooking, totem buffs and gambles"><dt>Value</dt><dd className="gold">≈{fmt(gold, 0)}g</dd></div>
        <div><dt>Species</dt><dd>{species}{big ? <span className="gold"> · {big}★</span> : ""}</dd></div>
        <div className="wide"><dt>Biggest</dt><dd>{best ? `${best.fish} · ${lb(best.weight)}` : "—"}</dd></div>
        <div><dt>Top bait</dt><dd>{topBait ? `${topBait[0]} ×${topBait[1]}` : "—"}</dd></div>
        <div title="average / best bait score"><dt>Bait</dt><dd>{scores.length ? `${fmt(scores.reduce((a, b) => a + b, 0) / scores.length, 0)} / ${fmt(Math.max(...scores), 0)}` : "—"}</dd></div>
        <div><dt>Deepest</dt><dd>{depths.length ? fmt(Math.max(...depths), 0) : "—"}</dd></div>
        <div title="line / rod / sinker upgrade levels"><dt>L/R/S</dt><dd>{up ? `${up.line}/${up.rod}/${up.sinker}` : "—"}</dd></div>
      </dl>
    </div>
  );
}

function AddPlayer() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ profileId: string; playerName: string }[]>([]);
  const timer = useRef(0);
  const search = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 2) { setHits([]); return; }
    timer.current = window.setTimeout(async () => {
      try { setHits((await api.search(v.trim())).suggestions.slice(0, 8).map((s) => ({ profileId: s.profileId, playerName: s.playerName || s.label || s.profileId }))); } catch { setHits([]); }
    }, 250);
  };
  return (
    <div className="addp">
      <input type="search" placeholder="Add a player by name…" value={q} onChange={(e) => search(e.target.value)} />
      {hits.length > 0 && (
        <div className="hits">
          {hits.map((h) => <button key={h.profileId} onClick={() => { session.addCrew(h.profileId, h.playerName); setQ(""); setHits([]); }}>{h.playerName} <small>#{h.profileId}</small></button>)}
        </div>
      )}
    </div>
  );
}
