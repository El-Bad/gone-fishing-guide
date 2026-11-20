import { useEffect, useMemo, useState } from "react";
import { MAPS, mapId, type MapId } from "./gameData";
import { session, useSession, type Catch, type Member } from "./session";
import { CatchList } from "./components/CatchList";
import { Crew } from "./components/Crew";
import { Feed } from "./components/Feed";
import { PlayerPicker } from "./components/PlayerPicker";
import { Sessions } from "./components/Sessions";
import { MapView } from "./components/MapView";
import { GroupTotals, SpeciesTable } from "./components/Totals";
import { clock, useNow } from "./util";

export function App() {
  const s = useSession();
  const now = useNow(2000); // keeps "x s ago" fresh
  useEffect(() => session.start(), []);
  const [picking, setPicking] = useState(false);

  const crewIds = useMemo(() => new Set(Object.values(s.members).filter((m) => m.status !== "ignored").map((m) => m.pid)), [s.members]);
  const current = useMemo(() => s.catches.filter((c) => crewIds.has(c.pid) && c.at >= s.sessionStart), [s.catches, crewIds, s.sessionStart]);
  // past sessions switched on with "Include": their catches join the map, feed, stats and lists
  const included = useMemo(() => s.sessions.filter((r) => s.includeIds.includes(r.id)), [s.sessions, s.includeIds]);
  const catches = useMemo(() => {
    if (!included.length) return current;
    const have = new Set(current.map((c) => c.id));
    const past = included.flatMap((r) => r.catches.filter((c) => !have.has(c.id)).map((c) => ({ ...c, sid: r.id, fresh: undefined })));
    return [...current, ...past].sort((a, b) => b.at - a.at);
  }, [current, included]);
  const members = useMemo(() => {
    const m: Record<string, Member> = {};
    for (const r of included) for (const c of r.crew) if (!s.members[c.pid]) m[c.pid] = { pid: c.pid, name: c.name, color: c.color, avatar: c.avatar, status: "crew" };
    return { ...m, ...s.members };
  }, [included, s.members]);

  // maps visited this session, current map first
  const maps = useMemo(() => {
    const seen = new Map<MapId, number>();
    catches.forEach((c) => { const id = mapId(c.map); if (id) seen.set(id, (seen.get(id) ?? 0) + 1); });
    const cur = mapId(s.myMap);
    const ids = [...seen.keys()];
    if (cur && !ids.includes(cur)) ids.unshift(cur);
    return ids.sort((a, b) => (a === cur ? -1 : b === cur ? 1 : (seen.get(b) ?? 0) - (seen.get(a) ?? 0)));
  }, [catches, s.myMap]);
  const [picked, setPicked] = useState<MapId | null>(null);
  const map: MapId = picked && maps.includes(picked) ? picked : maps[0] ?? "lake";
  const [focus, setFocus] = useState<number | null>(null);
  const [feedOpen, setFeedOpen] = useState(() => localStorage.getItem("gfl-feed") !== "0");
  const toggleFeed = () => setFeedOpen((o) => { localStorage.setItem("gfl-feed", o ? "0" : "1"); return !o; });
  const [selected, setSelected] = useState<string | null>(null); // player filter shared by map, cards and list
  const sel = selected && crewIds.has(selected) ? selected : null;
  const pick = (c: Catch) => {
    const id = mapId(c.map);
    if (id) setPicked(id);
    setFocus(null);
    requestAnimationFrame(() => setFocus(c.id));
    document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth" });
  };

  const me = s.members[s.meId];
  const statusPill = s.status === "live" ? <span className="pill live"><i />Live · {s.ratePerMin} catches/min game-wide</span>
    : s.status === "reconnecting" ? <span className="pill warn"><i />Reconnecting…</span>
    : s.status === "error" ? <span className="pill warn"><i />{s.error}</span>
    : <span className="pill"><i />Loading…</span>;

  if (!s.meId) return <PlayerPicker />;

  return (
    <>
      {picking && <PlayerPicker onClose={() => setPicking(false)} />}
      <div className="screen">
        <header className="top">
          <div className="brand"><b>GONE Fishing</b><span>Session tracker</span></div>
          {statusPill}
          <div className="sess">
            <span className="eyebrow">Session since {clock(s.sessionStart)}{s.sessionMode === "auto" ? " (auto)" : ""}</span>
            {s.myMap && <span className="eyebrow">· {me?.name ?? "You"}: {s.myMap.replace(/^The /, "")}, day {s.myDay}</span>}
            <button className="btn" onClick={() => session.newSession("manual")} title="Only count catches from now on">New session</button>
            {s.sessionMode === "manual" && <button className="btn ghost" onClick={() => session.newSession("auto")} title="Start from your first catch after your last 45-minute break">Auto</button>}
            <a className="btn ghost" href="#below">Catches ↓</a>
            <a className="btn ghost" href="/guide/index.html" title="GONE Fishing field guide: every fish, bait, map and threat">Field guide</a>
            <button className="btn ghost" onClick={() => setPicking(true)} title="Track a different player">Switch player</button>
          </div>
        </header>
        <div className="stage">
          <div className="mapcol">
            <MapView key={map} map={map} catches={catches.filter((c) => mapId(c.map) === map)} members={members} now={now} focusId={focus} selected={sel}
              insetLeft={feedOpen ? 320 : 0}
              overlay={<Feed catches={catches} members={members} now={now} selected={sel} onPick={pick} open={feedOpen} onToggle={toggleFeed} />}
              tabs={maps.length > 1 ? maps.map((id) => ({ id, name: MAPS[id].name, color: MAPS[id].color, on: id === map, pick: () => setPicked(id) })) : []} />
          </div>
          <aside className="side">
            <GroupTotals catches={sel ? catches.filter((c) => c.pid === sel) : catches} members={members} start={s.sessionStart} now={now} label={`${sel ? `${members[sel]?.name} this session` : "Whole group this session"}${included.length ? ` + ${included.length} past` : ""}`} />
            <Crew s={s} catches={catches} now={now} selected={sel} onSelect={setSelected} />
            <Sessions s={s} current={current} now={now} />
          </aside>
        </div>
      </div>

      <main id="below">
        <div className="grid2 b">
          <CatchList catches={catches} members={members} now={now} onPick={pick} who={sel} onWho={setSelected} />
          <div className="panel"><h2>By species</h2><SpeciesTable catches={sel ? catches.filter((c) => c.pid === sel) : catches} members={members} /></div>
        </div>
      </main>
      <p className="foot">Live data from the public <a href="https://gonefishing.gg" target="_blank" rel="noreferrer">gonefishing.gg</a> API, relayed by the Vite dev server. Crewmates are found by matching your map and in-game day, live and by looking back through everyone's catches this session; positions and depth come from each catch's details. Unofficial fan tool.</p>
    </>
  );
}
