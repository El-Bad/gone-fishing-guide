import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MAPS, loadMarkers, worldToPct, type MapId, type Marker } from "../gameData";
import type { Catch, Member } from "../session";
import { ago, lb } from "../util";

interface Tab { id: MapId; name: string; color: string; on: boolean; pick: () => void }
interface Props { map: MapId; catches: Catch[]; members: Record<string, Member>; now: number; focusId?: number | null; selected?: string | null; tabs?: Tab[]; overlay?: ReactNode; insetLeft?: number }

const MAXS = 8;
const START_ZOOM = 1.6; // one '+' step in from 'whole map'

export function MapView({ map, catches, members, now, focusId, selected, tabs = [], overlay, insetLeft = 0 }: Props) {
  const inset = useRef(insetLeft);
  inset.current = insetLeft;
  const viewRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const t = useRef({ s: 1, tx: 0, ty: 0, base: 0 });
  const touched = useRef(false); // user has panned/zoomed: stop auto-framing
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showDepth, setShowDepth] = useState(false);
  const [info, setInfo] = useState<string>("Drag to move · scroll to zoom");

  useEffect(() => { loadMarkers().then((m) => setMarkers(m[map]?.markers.filter((x: Marker) => x.c === "structure" || x.c === "custom" || x.c === "vehicle") ?? [])); }, [map]);

  const dots = useMemo(() => catches.filter((c) => c.x != null && c.y != null).map((c) => ({ c, p: worldToPct(map, c.x!, c.y!) })), [catches, map]);
  const maxW = Math.max(1, ...dots.map((d) => d.c.weight));
  // where the crew is fishing: median position (ignores the odd far-away catch); map centre if no catches yet
  const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 50; };
  const home = useRef({ x: 50, y: 50 });
  home.current = { x: median(dots.map((d) => d.p.x)), y: median(dots.map((d) => d.p.y)) };

  // ---- pan / zoom (imperative for smoothness)
  const apply = () => {
    const v = viewRef.current, inner = innerRef.current;
    if (!v || !inner) return;
    const k = t.current, W = k.base * k.s, vw = v.clientWidth, vh = v.clientHeight;
    // allow dragging a little past the map's edges (up to 15% of the view, max 140px)
    const mx = Math.min(140, vw * 0.15), my = Math.min(140, vh * 0.15);
    k.tx = W <= vw ? Math.min(Math.max(k.tx, -mx), vw - W + mx) : Math.min(Math.max(k.tx, vw - W - mx), mx);
    k.ty = W <= vh ? Math.min(Math.max(k.ty, -my), vh - W + my) : Math.min(Math.max(k.ty, vh - W - my), my);
    inner.style.width = inner.style.height = `${W}px`;
    inner.style.transform = `translate(${k.tx}px,${k.ty}px)`;
  };
  const fit = () => { const v = viewRef.current!; const k = t.current; k.base = Math.min(v.clientWidth, v.clientHeight); k.s = 1; k.tx = (v.clientWidth - k.base) / 2; k.ty = (v.clientHeight - k.base) / 2; apply(); };
  const zoomAt = (ns: number, mx: number, my: number) => { const k = t.current; ns = Math.min(MAXS, Math.max(1, ns)); k.tx = mx - ((mx - k.tx) * ns) / k.s; k.ty = my - ((my - k.ty) * ns) / k.s; k.s = ns; apply(); };
  const centerOn = (px: number, py: number, s: number) => { const v = viewRef.current!; const k = t.current; k.s = Math.min(MAXS, Math.max(1, s)); k.tx = inset.current + (v.clientWidth - inset.current) / 2 - (px / 100) * k.base * k.s; k.ty = v.clientHeight / 2 - (py / 100) * k.base * k.s; apply(); };

  const startView = () => { const v = viewRef.current!; t.current.base = Math.min(v.clientWidth, v.clientHeight); centerOn(home.current.x, home.current.y, START_ZOOM); };

  useLayoutEffect(() => {
    const v = viewRef.current!;
    touched.current = false;
    startView();
    const ro = new ResizeObserver(() => { if (!touched.current) startView(); else { t.current.base = Math.min(v.clientWidth, v.clientHeight); apply(); } });
    const touch = (e: Event) => { if (!inOverlay(e)) touched.current = true; };
    v.addEventListener("wheel", touch, { passive: true }); v.addEventListener("pointerdown", touch); v.addEventListener("dblclick", touch);
    ro.observe(v);
    const inOverlay = (e: Event) => !!(e.target as HTMLElement).closest(".mapoverlay");
    const onWheel = (e: WheelEvent) => { if (inOverlay(e)) return; e.preventDefault(); const r = v.getBoundingClientRect(); const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; zoomAt(t.current.s * Math.exp(-d * 0.0018), e.clientX - r.left, e.clientY - r.top); };
    v.addEventListener("wheel", onWheel, { passive: false });
    const ptrs = new Map<number, { x: number; y: number }>();
    let last = { x: 0, y: 0 }, pinch: { d: number; s: number } | null = null;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".mapctl,.mapoverlay")) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); v.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; v.classList.add("dragging");
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: t.current.s }; }
    };
    const move = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()], r = v.getBoundingClientRect(); zoomAt((pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
      t.current.tx += e.clientX - last.x; t.current.ty += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; apply();
    };
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) v.classList.remove("dragging"); else last = [...ptrs.values()][0]; };
    const dbl = (e: MouseEvent) => { if ((e.target as HTMLElement).closest(".mapctl,.mapoverlay")) return; const r = v.getBoundingClientRect(); zoomAt(t.current.s * (e.shiftKey ? 0.5 : 2), e.clientX - r.left, e.clientY - r.top); };
    v.addEventListener("pointerdown", down); v.addEventListener("pointermove", move); v.addEventListener("pointerup", up); v.addEventListener("pointercancel", up); v.addEventListener("dblclick", dbl);
    return () => { ro.disconnect(); v.removeEventListener("wheel", touch); v.removeEventListener("pointerdown", touch); v.removeEventListener("dblclick", touch); v.removeEventListener("wheel", onWheel); v.removeEventListener("pointerdown", down); v.removeEventListener("pointermove", move); v.removeEventListener("pointerup", up); v.removeEventListener("pointercancel", up); v.removeEventListener("dblclick", dbl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => { if (!touched.current && viewRef.current) startView(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots.length > 0, Math.round(home.current.x), Math.round(home.current.y), insetLeft]);

  // fly to a catch picked from the list
  useEffect(() => {
    if (focusId == null) return;
    const d = dots.find((x) => x.c.id === focusId);
    if (d) { touched.current = true; centerOn(d.p.x, d.p.y, Math.max(3, t.current.s)); setInfo(describe(d.c)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const describe = (c: Catch) => `${members[c.pid]?.name ?? c.pid}: ${c.fish} · ${lb(c.weight)} · ${c.bait ?? "?"}${c.depth != null ? ` · depth ${Math.round(c.depth)}` : ""} · day ${c.day} · ${ago(c.at, now)}`;
  const withPos = dots.length, without = catches.length - withPos;

  return (
    <div className="mapbox">
      <div className="mapbar">
        {tabs.length ? <div className="maptabs">{tabs.map((t) => <button key={t.id} aria-pressed={t.on} style={{ ["--mc" as string]: t.color }} onClick={t.pick}>{t.name}</button>)}</div> : <h2>{MAPS[map].name}</h2>}
        <span className="grow" />
        <button className="tg" aria-pressed={showMarkers} onClick={() => setShowMarkers(!showMarkers)}>Landmarks</button>
        <button className="tg" aria-pressed={showDepth} onClick={() => setShowDepth(!showDepth)}>Depth chart</button>
      </div>
      <div className="mapview" ref={viewRef}>
        <div className="mapinner" ref={innerRef}>
          <img className="bg" src={`/maps/${map}.webp`} alt={`Top-down map of the ${MAPS[map].name}`} draggable={false} />
          <img className="depth" src={`/maps/${map}-depth.webp`} alt="" draggable={false} style={{ opacity: showDepth ? 0.6 : 0 }} />
          {showMarkers && markers.map((m, i) => (
            <span key={i} className="lm" style={{ left: `${m.x}%`, top: `${m.y}%` }}><i />{m.l}</span>
          ))}
          {dots.slice().reverse().sort((a, b) => Number(a.c.pid === selected) - Number(b.c.pid === selected)).map(({ c, p }) => {
            const size = 10 + 14 * Math.sqrt(c.weight / maxW);
            const fresh = c.fresh && now - c.fresh < 60_000;
            return (
              <button key={c.id} className={`cdot${fresh ? " fresh" : ""}${c.id === focusId ? " focus" : ""}${selected && c.pid !== selected ? " dim" : ""}`} title={describe(c)} aria-label={describe(c)}
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: size, height: size, background: members[c.pid]?.color ?? "#fff" }}
                onClick={() => setInfo(describe(c))} />
            );
          })}
        </div>
        {overlay && <div className="mapoverlay">{overlay}</div>}
        <div className="mapctl">
          <button title="Zoom in" onClick={() => { touched.current = true; const v = viewRef.current!; zoomAt(t.current.s * 1.6, v.clientWidth / 2, v.clientHeight / 2); }}>+</button>
          <button title="Zoom out" onClick={() => { touched.current = true; const v = viewRef.current!; zoomAt(t.current.s / 1.6, v.clientWidth / 2, v.clientHeight / 2); }}>−</button>
          <button title="Whole map" onClick={() => { touched.current = true; fit(); }}>⤢</button>
        </div>
      </div>
      <div className="mapinfo">
        <span>{info}</span>
        <span className="eyebrow">{withPos} catch{withPos === 1 ? "" : "es"} placed{without > 0 ? ` · ${without} still loading` : ""}</span>
      </div>
      <div className="legend">
        {Object.values(members).filter((m) => m.status !== "ignored").map((m) => (
          <span key={m.pid}><i style={{ background: m.color }} />{m.name}</span>
        ))}
        <span className="eyebrow">Dot size = weight</span>
      </div>
    </div>
  );
}
