import { useEffect, useState } from "react";

export const fmt = (n: number | null | undefined, digits?: number) =>
  n == null || !isFinite(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits ?? (Math.abs(n) < 10 ? 2 : Math.abs(n) < 1000 ? 1 : 0) });
export const lb = (n: number | null | undefined) => (n == null ? "—" : `${fmt(n)} lb`);

export function ago(t: number | string | undefined, now = Date.now()) {
  if (t == null) return "—";
  const s = (now - (typeof t === "number" ? t : Date.parse(t))) / 1000;
  if (!isFinite(s)) return "—";
  if (s < 10) return "just now";
  if (s < 60) return `${Math.round(s)} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export function duration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
export const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** re-render every `ms` so relative times stay fresh */
export function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
