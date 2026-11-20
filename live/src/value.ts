// Catch value in trader gold, from the game's own weight->price curves (sampled from gonefishing.gg/fish-curves).
// Base gold for the species + weight, times the catch's bonuses (Fish Whisperer, hotspot, beer, day, golden totem,
// doubloons, Jeremy Wade). Cooking, totem shop buffs and gambles come later and aren't included.
import table from "./data/goldTable.json";

type Row = [lo: number, hi: number, values: number[]];
const T = table as unknown as Record<string, Row | number | string>;
export const JW_MULT = (T._jwMult as number) ?? 1.25;

export function baseGold(fish: string, weight: number): number | null {
  const row = T[fish];
  if (!Array.isArray(row)) return null;
  const [lo, hi, v] = row as Row;
  const n = v.length - 1;
  if (!(weight > 0) || weight <= lo) return v[0];
  if (weight >= hi) return v[n];
  const x = (Math.log(weight / lo) / Math.log(hi / lo)) * n; // samples are log-spaced
  const i = Math.floor(x);
  return v[i] + (v[i + 1] - v[i]) * (x - i);
}

/** value of one catch; `mult` = product of its bonuses (1 until the catch details have loaded) */
export const catchGold = (c: { fish: string; weight: number; mult?: number }) => {
  const b = baseGold(c.fish, c.weight);
  return b == null ? null : b * (c.mult ?? 1);
};
export const sumGold = (cs: { fish: string; weight: number; mult?: number }[]) => cs.reduce((a, c) => a + (catchGold(c) ?? 0), 0);
