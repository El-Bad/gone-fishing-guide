import { useMemo } from "react";
import { FISH, tierLabel } from "../gameData";
import type { Catch, Member } from "../session";
import { duration, fmt, lb } from "../util";
import { sumGold } from "../value";

export function GroupTotals({ catches, members, start, now, label }: { catches: Catch[]; members: Record<string, Member>; start: number; now: number; label?: string }) {
  const t = useMemo(() => {
    const species = new Set(catches.map((c) => c.fish));
    const big = catches.filter((c) => FISH[c.fish]?.tier === "l");
    const best = catches.reduce<Catch | null>((a, c) => (!a || c.weight > a.weight ? c : a), null);
    const value = catches.reduce((a, c) => a + (FISH[c.fish]?.value ?? 0), 0);
    const hours = Math.max((now - start) / 3_600_000, 1 / 60);
    return { gold: sumGold(catches), n: catches.length, w: catches.reduce((a, c) => a + c.weight, 0), species: species.size, big, best, value, perHour: catches.length / hours };
  }, [catches, start, now]);
  return (
    <div className="tiles">
      <div className="tiles-h eyebrow">{label ?? "Whole group this session"}</div>
      <div className="tile"><b>{t.n}</b><span>fish caught</span></div>
      <div className="tile"><b>{fmt(t.w)}</b><span>lb in total</span></div>
      <div className="tile" title="Trader gold before cooking, totem buffs and gambles, from the game's price curves"><b className="gold">≈{fmt(t.gold, 0)}</b><span>gold value</span></div>
      <div className="tile"><b>{t.species}</b><span>species</span></div>
      <div className="tile"><b>{fmt(t.perHour, 0)}</b><span>fish / hour</span></div>
      <div className="tile"><b>{t.best ? t.best.fish : "—"}</b><span>biggest · {t.best ? `${lb(t.best.weight)} by ${members[t.best.pid]?.name ?? "?"}` : "—"}</span></div>
      <div className="tile"><b className={t.big.length ? "gold" : ""}>{t.big.length}</b><span>legendary+</span></div>
      <div className="tile"><b>{duration(now - start)}</b><span>session length</span></div>
    </div>
  );
}

export function SpeciesTable({ catches, members }: { catches: Catch[]; members: Record<string, Member> }) {
  const rows = useMemo(() => {
    const m = new Map<string, Catch[]>();
    catches.forEach((c) => m.set(c.fish, [...(m.get(c.fish) ?? []), c]));
    return [...m.entries()].map(([fish, cs]) => {
      const best = cs.reduce((a, c) => (c.weight > a.weight ? c : a));
      const who = new Map<string, number>();
      cs.forEach((c) => who.set(c.pid, (who.get(c.pid) ?? 0) + 1));
      return { fish, n: cs.length, w: cs.reduce((a, c) => a + c.weight, 0), best, who: [...who.entries()].sort((a, b) => b[1] - a[1]) };
    }).sort((a, b) => b.n - a.n || b.w - a.w);
  }, [catches]);
  if (!rows.length) return <p className="hint">No fish yet this session.</p>;
  return (
    <div className="tablewrap">
      <table className="t">
        <thead><tr><th>Fish</th><th>Tier</th><th className="n">Caught</th><th className="n">Total</th><th className="n">Biggest</th><th>By</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.fish}>
              <td className="nm">{r.fish}</td>
              <td><span className={`tier ${FISH[r.fish]?.tier ?? ""}`}>{tierLabel(r.fish)}</span></td>
              <td className="n">{r.n}</td>
              <td className="n">{lb(r.w)}</td>
              <td className="n">{lb(r.best.weight)} <small style={{ color: members[r.best.pid]?.color }}>{members[r.best.pid]?.name}</small></td>
              <td><span className="who">{r.who.map(([pid, n]) => <span key={pid} className="chip" style={{ borderColor: members[pid]?.color }}><i style={{ background: members[pid]?.color }} />{members[pid]?.name} ×{n}</span>)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

