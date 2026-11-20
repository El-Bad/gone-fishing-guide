import { useRef, useState } from "react";
import { FISH, MAPS, mapId } from "../gameData";
import { session, type Catch, type SessionRecord, type State } from "../session";
import { duration, fmt, lb } from "../util";
import { sumGold } from "../value";

const when = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function stats(cs: Catch[], start: number, end: number) {
  const hours = Math.max((end - start) / 3_600_000, 1 / 60);
  const best = cs.reduce<Catch | null>((a, c) => (!a || c.weight > a.weight ? c : a), null);
  const days = cs.map((c) => c.day).filter(Boolean);
  return {
    fish: cs.length, weight: cs.reduce((a, c) => a + c.weight, 0), gold: sumGold(cs), species: new Set(cs.map((c) => c.fish)).size,
    legendary: cs.filter((c) => FISH[c.fish]?.tier === "l").length, perHour: cs.length / hours, length: end - start,
    days: days.length ? `${Math.min(...days)}–${Math.max(...days)}` : "—", best,
  };
}

/** Past sessions: save, import/export, compare side by side, or include their catches in the current view. */
export function Sessions({ s, current, now }: { s: State; current: Catch[]; now: number }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const save = async () => { const r = await session.archive(); flash(r ? `Saved: ${r.catches.length} catches` : "Nothing to save yet"); };
  const importFiles = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      try { await session.importSession(JSON.parse(await f.text())); flash(`Imported ${f.name}`); }
      catch (e) { flash(`Couldn't import ${f.name}: ${(e as Error).message}`); }
    }
    if (file.current) file.current.value = "";
  };
  const exportRec = (r: SessionRecord) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r)], { type: "application/json" }));
    a.download = `gone-fishing-${new Date(r.start).toISOString().slice(0, 10)}-${(r.title ?? r.maps.map((m) => mapId(m) ?? m).join("-")).replace(/[^\w-]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cmp = s.sessions.find((r) => r.id === s.compareId);
  return (
    <div className="panel sessions">
      <div className="ph2">
        <h2>Sessions</h2>
        <span className="sess-actions">
          <button className="btn" onClick={save} title="Save this session to the history now (it's also saved automatically when a new session starts)">Save this session</button>
          <button className="btn ghost" onClick={() => file.current?.click()} title="Load a session file (exported here, or made with scripts/export-session.mjs)">Import</button>
          <input ref={file} type="file" accept=".json,application/json" multiple hidden onChange={(e) => importFiles(e.target.files)} />
        </span>
      </div>
      {msg && <p className="hint">{msg}</p>}
      {!s.sessions.length && <p className="hint">Finished sessions are saved here automatically when a new one starts. Compare against them, or include their catches on the map, feed and stats.</p>}
      <div className="slist">
        {s.sessions.map((r) => {
          const st = stats(r.catches, r.start, r.end);
          const inc = s.includeIds.includes(r.id), cmpOn = s.compareId === r.id;
          return (
            <div key={r.id} className={`srow${inc ? " inc" : ""}${cmpOn ? " cmp" : ""}`}>
              <div className="stop">
                <b title={r.title ? when(r.start) : undefined}>{r.title ?? when(r.start)}</b>
                {r.maps.map((m) => { const id = mapId(m); return id ? <span key={m} className="md" style={{ background: MAPS[id].color }}>{MAPS[id].code}</span> : null; })}
                <span className="sub">{r.title ? `${when(r.start)} · ` : ""}{duration(r.end - r.start)} · days {st.days}</span>
              </div>
              <div className="sub">
                {r.crew.map((c) => <span key={c.pid} className="screw" title={c.name}><i style={{ background: c.color }} />{c.name}</span>)}
              </div>
              <div className="sline">
                <span><b>{st.fish}</b> fish · {lb(st.weight)} · <span className="gold">≈{fmt(st.gold, 0)}g</span></span>
                <span className="sbtns">
                  <button className={`tg${cmpOn ? " on" : ""}`} aria-pressed={cmpOn} onClick={() => session.setCompare(cmpOn ? null : r.id)} title="Compare with the current session">Compare</button>
                  <button className="tg" aria-pressed={inc} onClick={() => session.toggleInclude(r.id)} title="Show this session's catches on the map, feed and stats">Include</button>
                  <button className="link" onClick={() => { const t = prompt("Name this session", r.title ?? ""); if (t !== null) session.renameSession(r.id, t.trim()); }}>Rename</button>
                  <button className="link" onClick={() => exportRec(r)}>Export</button>
                  <button className="link danger" onClick={() => confirm(`Delete the session from ${when(r.start)}?`) && session.deleteSession(r.id)}>Delete</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {cmp && <Compare now={now} cur={stats(current, s.sessionStart, Math.max(now, s.sessionStart))} past={stats(cmp.catches, cmp.start, cmp.end)} pastLabel={cmp.title ?? when(cmp.start)} />}
    </div>
  );
}

function Compare({ cur, past, pastLabel }: { cur: ReturnType<typeof stats>; past: ReturnType<typeof stats>; pastLabel: string; now: number }) {
  const rows: [string, number, number, (n: number) => string][] = [
    ["Fish", cur.fish, past.fish, (n) => fmt(n, 0)],
    ["Weight", cur.weight, past.weight, (n) => lb(n)],
    ["Gold", cur.gold, past.gold, (n) => `≈${fmt(n, 0)}`],
    ["Species", cur.species, past.species, (n) => fmt(n, 0)],
    ["Legendary+", cur.legendary, past.legendary, (n) => fmt(n, 0)],
    ["Fish / hour", cur.perHour, past.perHour, (n) => fmt(n, 0)],
    ["Length", cur.length, past.length, (n) => duration(n)],
  ];
  return (
    <div className="compare">
      <h3 className="eyebrow">This session vs {pastLabel}</h3>
      <table className="t">
        <thead><tr><th></th><th className="n">Now</th><th className="n">Then</th><th className="n">Δ</th></tr></thead>
        <tbody>
          {rows.map(([k, a, b, f]) => {
            const d = a - b, pct = b ? Math.round((d / b) * 100) : null;
            return (
              <tr key={k}>
                <td>{k}</td><td className="n">{f(a)}</td><td className="n">{f(b)}</td>
                <td className={`n ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>{k === "Length" ? (d >= 0 ? "+" : "−") + duration(Math.abs(d)) : `${d > 0 ? "+" : d < 0 ? "−" : ""}${pct != null ? `${Math.abs(pct)}%` : f(Math.abs(d))}`}</td>
              </tr>
            );
          })}
          <tr><td>Biggest</td><td className="n">{cur.best ? `${cur.best.fish} ${lb(cur.best.weight)}` : "—"}</td><td className="n">{past.best ? `${past.best.fish} ${lb(past.best.weight)}` : "—"}</td><td /></tr>
          <tr><td>Days</td><td className="n">{cur.days}</td><td className="n">{past.days}</td><td /></tr>
        </tbody>
      </table>
    </div>
  );
}
