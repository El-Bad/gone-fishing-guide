import { useMemo } from "react";
import { FISH, MAPS, mapId, tierLabel } from "../gameData";
import type { Catch, Member } from "../session";
import { ago, fmt, lb } from "../util";
import { catchGold, sumGold } from "../value";
import { sizeOf } from "../size";

const tierKey = (fish: string) => {
  const f = FISH[fish];
  if (!f) return "c";
  return f.tier === "l" ? (fish === "Rhizodus" ? "my" : "l") : f.tier;
};
const gold = (n: number | null) => (n == null ? "" : `${fmt(n, n < 100 ? 1 : 0)}g`);

interface Props { catches: Catch[]; members: Record<string, Member>; now: number; selected: string | null; onPick: (c: Catch) => void; open: boolean; onToggle: () => void }

export function Feed({ catches, members, now, selected, onPick, open, onToggle }: Props) {
  const list = useMemo(() => (selected ? catches.filter((c) => c.pid === selected) : catches).slice(0, 200), [catches, selected]);
  // group consecutive catches by in-game day (and map): newest group first
  const groups = useMemo(() => {
    const out: { key: string; day: number; map: string; sid?: string; items: Catch[] }[] = [];
    for (const c of list) {
      const last = out[out.length - 1];
      if (last && last.day === c.day && last.map === c.map && last.sid === c.sid) last.items.push(c);
      else out.push({ key: `${c.sid ?? "now"}-${c.map}-${c.day}-${c.id}`, day: c.day, map: c.map, sid: c.sid, items: [c] });
    }
    return out;
  }, [list]);

  if (!open) return <button className="feedpill" onClick={onToggle} title="Show the catch feed">Catch feed · {list.length}</button>;

  return (
    <div className="feed" role="log" aria-label="Catch feed" aria-live="polite">
      <div className="feedh">
        <b>Catch feed</b>
        <span className="eyebrow">{selected ? members[selected]?.name : "everyone"}</span>
        <button className="fclose" onClick={onToggle} title="Hide the feed">✕</button>
      </div>
      <div className="fitems">
        {list.length === 0 && <p className="hint">Waiting for the first catch…</p>}
        {groups.map((g) => {
          const mid = mapId(g.map);
          return (
            <section key={g.key} className="fgroup">
              <h4 className="fday">
                {g.sid && <span className="fpast" title="From a past session">{new Date(g.items[0].at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                <span>Day {g.day}</span>
                {mid && <span className="md" style={{ background: MAPS[mid].color }}>{MAPS[mid].code}</span>}
                <span className="fdaystats">{g.items.length} fish · {lb(g.items.reduce((a, c) => a + c.weight, 0))} · ≈{gold(sumGold(g.items))}</span>
              </h4>
              {g.items.map((c) => <FeedRow key={c.id} c={c} m={members[c.pid]} now={now} onPick={onPick} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FeedRow({ c, m, now, onPick }: { c: Catch; m?: Member; now: number; onPick: (c: Catch) => void }) {
  const sz = sizeOf(c.fish, c.weight);
  const g = catchGold(c);
  const fresh = c.fresh && now - c.fresh < 12_000;
  return (
    <button className={`fi t-${tierKey(c.fish)}${fresh ? " fresh" : ""}`} style={{ ["--pc" as string]: m?.color ?? "#888" }} onClick={() => onPick(c)}
      title={`${c.fish} · ${tierLabel(c.fish)} · ${lb(c.weight)}${sz ? ` (${sz.vsAvg.toFixed(1)}× average, ${Math.round(sz.vsRecord * 100)}% of record)` : ""}${g != null ? ` · ≈${fmt(g, 1)} gold` : ""} · ${new Date(c.at).toLocaleTimeString()}`}>
      <span className="fl1">
        <b className="fname">{c.fish}</b>
        {sz && <span className={`sz ${sz.k}`}>{sz.label}</span>}
        <span className="fw">{lb(c.weight)}</span>
        <span className="fg">{gold(g)}</span>
      </span>
      <span className="fl2">
        <span className="fwho"><i />{m?.name ?? c.pid}</span>
        <span className="fmeta">{c.bait ?? "—"}{c.score != null ? ` ${fmt(c.score, 0)}` : ""}{c.depth != null ? ` · ↓${fmt(c.depth, 0)}` : ""}</span>
        <span className="fago">{ago(c.at, now)}</span>
      </span>
      {sz && <span className="frec"><i style={{ width: `${Math.max(3, Math.sqrt(sz.vsRecord) * 100)}%` }} /></span>}
    </button>
  );
}
