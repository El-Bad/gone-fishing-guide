import { FISH, MAPS, mapId, tierLabel } from "../gameData";
import type { Catch, Member } from "../session";
import { ago, clock, fmt, lb } from "../util";

export function CatchList({ catches, members, now, onPick, who: sel, onWho }: { catches: Catch[]; members: Record<string, Member>; now: number; onPick: (c: Catch) => void; who: string | null; onWho: (pid: string | null) => void }) {
  const who = sel ?? "all";
  const setWho = (v: string) => onWho(v === "all" ? null : v);
  const crew = Object.values(members).filter((m) => m.status !== "ignored");
  const list = who === "all" ? catches : catches.filter((c) => c.pid === who);
  return (
    <div className="panel">
      <div className="listhead">
        <h2>Catches this session <span className="eyebrow">live</span></h2>
        <div className="seg">
          <button aria-pressed={who === "all"} onClick={() => setWho("all")}>Everyone</button>
          {crew.map((m) => <button key={m.pid} aria-pressed={who === m.pid} onClick={() => setWho(m.pid)}><i style={{ background: m.color }} />{m.name}</button>)}
        </div>
      </div>
      <div className="clist">
        {list.length === 0 && <p className="hint">Nothing caught yet. New catches appear here within a second or two.</p>}
        {list.map((c) => {
          const m = members[c.pid], f = FISH[c.fish], mid = mapId(c.map);
          const fresh = c.fresh && now - c.fresh < 8000;
          return (
            <button key={c.id} className={`crow${fresh ? " fresh" : ""}`} style={{ borderLeftColor: m?.color }} onClick={() => onPick(c)} title={c.x != null ? "Show on map" : "No position for this catch"}>
              <span className="ct" title={new Date(c.at).toLocaleString()}>{clock(c.at)}<small>{ago(c.at, now)}</small></span>
              <span className="cw">{m?.name ?? c.pid}</span>
              <span className="cf"><b>{c.fish}</b>{f && f.tier !== "c" && <span className={`tier ${f.tier}`}>{tierLabel(c.fish)}</span>}</span>
              <span className="cl">{lb(c.weight)}</span>
              <span className="cm">
                {mid && <span className="md" style={{ background: MAPS[mid].color }}>{MAPS[mid].code}</span>}
                {c.bait ?? "—"}{c.score != null && <small> · score {fmt(c.score, 0)}</small>}{c.depth != null && <small> · {fmt(c.depth, 0)} deep</small>}<small> · day {c.day}</small>
                {c.x != null && <span className="pin" title="Has a map position">◉</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
