import { FISH } from "./gameData";

/** How big is this fish for its species? Compared with community catch data (average and record weight). */
export function sizeOf(fish: string, weight: number) {
  const f = FISH[fish];
  if (!f || !f.avgLb) return null;
  const vsAvg = weight / f.avgLb;
  const vsRecord = f.bestLb ? Math.min(1, weight / f.bestLb) : 0;
  const cls =
    vsRecord >= 0.8 ? { k: "rec", label: "record" }
    : vsAvg >= 4 ? { k: "mon", label: "monster" }
    : vsAvg >= 2 ? { k: "huge", label: "huge" }
    : vsAvg >= 1.25 ? { k: "big", label: "big" }
    : vsAvg >= 0.8 ? { k: "avg", label: "avg" }
    : vsAvg >= 0.45 ? { k: "small", label: "small" }
    : { k: "tiny", label: "tiny" };
  return { ...cls, vsAvg, vsRecord };
}
