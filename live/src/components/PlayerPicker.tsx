import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { session } from "../session";

/** "Who are you?" Search gonefishing.gg players by name (or paste a profile number/link). */
export function PlayerPicker({ onClose }: { onClose?: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ profileId: string; playerName: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const search = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    const id = v.match(/(?:player\/)?(\d{2,})\s*$/)?.[1]; // a profile number or a gonefishing.gg/player/<id> link
    if (id) { setHits([{ profileId: id, playerName: `Profile #${id}` }]); return; }
    if (v.trim().length < 2) { setHits([]); return; }
    timer.current = window.setTimeout(async () => {
      setBusy(true);
      try { setHits((await api.search(v.trim())).suggestions.slice(0, 10).map((s) => ({ profileId: s.profileId, playerName: s.playerName || s.label || s.profileId }))); }
      catch { setHits([]); }
      finally { setBusy(false); }
    }, 250);
  };

  return (
    <div className="picker-bg" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="picker" role="dialog" aria-label="Choose your player">
        <h1>Who are you?</h1>
        <p>Find your GONE Fishing player. The tracker follows your session live, works out who's in your lobby, and maps everyone's catches.</p>
        <input ref={input} type="search" placeholder="Your in-game / Steam name, or gonefishing.gg profile link" value={q} onChange={(e) => search(e.target.value)} />
        <div className="picker-hits">
          {busy && <p className="hint">Searching…</p>}
          {!busy && q.trim().length >= 2 && !hits.length && <p className="hint">No players found. You need at least one catch recorded on gonefishing.gg.</p>}
          {hits.map((h) => (
            <button key={h.profileId} onClick={() => session.setMe(h.profileId)}>
              <b>{h.playerName}</b> <small>#{h.profileId}</small>
            </button>
          ))}
        </div>
        <p className="hint">Saved in this browser. Share your session with <code>?player=&lt;your profile number&gt;</code>. Data comes from the public <a href="https://gonefishing.gg" target="_blank" rel="noreferrer">gonefishing.gg</a> API; unofficial fan tool.</p>
        {onClose && <button className="btn ghost picker-x" onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}
