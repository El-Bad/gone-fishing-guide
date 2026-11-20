// Fish/bait facts come straight from the field guide's data.js (single source of truth).
import dataSrc from "../../data.js?raw";

/** contents of a `const NAME = \`...\`;` template block in data.js (line endings normalised) */
const block = (name: string) => {
  const src = dataSrc.split("\r").join("");
  const start = src.indexOf(`const ${name} = `);
  if (start < 0) return "";
  const open = src.indexOf("`", start) + 1;
  return src.slice(open, src.indexOf("`", open)).trim();
};

export type Tier = "c" | "m" | "l";
export interface FishInfo { name: string; value: number; avgLb: number; bestLb: number; maps: string[]; tier: Tier }
export const FISH: Record<string, FishInfo> = {};
for (const line of block("FISH_RAW").split("\n")) {
  const [name, , avg, best, val, maps, tier] = line.split("|");
  if (name) FISH[name] = { name, value: +val, avgLb: +avg, bestLb: +best, maps: maps.split(""), tier: tier as Tier };
}
export const BAIT_SCORE: Record<string, number> = {};
for (const line of block("BAIT_RAW").split("\n")) {
  const [name, score] = line.split("|");
  if (name) BAIT_SCORE[name.toLowerCase()] = +score;
}
export const tierLabel = (fish: string) => {
  const f = FISH[fish];
  if (!f) return "";
  return f.tier === "c" ? "Common" : f.tier === "m" ? "Mid" : fish === "Rhizodus" ? "Mythic" : "Legendary+";
};

export type MapId = "lake" | "jungle" | "swamp" | "canyon" | "arctic";
export const MAPS: Record<MapId, { name: string; color: string; code: string }> = {
  lake: { name: "Lake", color: "#3f86c4", code: "L" },
  jungle: { name: "Jungle", color: "#2f9e5f", code: "J" },
  swamp: { name: "Swamp", color: "#7a8f2c", code: "S" },
  canyon: { name: "Canyon", color: "#c56a33", code: "C" },
  arctic: { name: "Arctic", color: "#5aa8cf", code: "A" },
};
const MAP_BY_API: Record<string, MapId> = { "The Lake": "lake", "The Jungle": "jungle", "The Swamp": "swamp", "The Canyon": "canyon", "The Canyons": "canyon", "The Arctic": "arctic" };
export const mapId = (apiName?: string | null): MapId | null => (apiName ? MAP_BY_API[apiName] ?? null : null);

// world -> image (%), from gonefishing.gg's interactive map calibration (pixel space 0..10000)
const CAL: Record<MapId, [number, number, number, number, number, number]> = {
  lake: [6.2149, -0.00769, 0.02219, 6.1889, -24103.6, -19346],
  canyon: [11.533540935366318, -0.02805048689798828, -0.018813078867083277, 11.50680765193157, -12273.818390804343, -27057.73353155004],
  swamp: [11.215095490489983, -0.014471909312340436, -0.05988141986953632, 11.177185726997578, -53897.81263221703, -42024.39086278273],
  jungle: [9.362363624897519, 0.10933551953921523, 0.022387589077381666, 9.398099682579723, -47391.29816064407, -10112.34241449624],
  arctic: [10.174784193159674, -0.0022103329658857973, -0.016958097946627504, 10.18410772364518, -67517.22582287056, -75290.5121408237],
};
export function worldToPct(map: MapId, x: number, y: number) {
  const [ax, ay, bx, by, cx, cy] = CAL[map];
  const det = ax * by - ay * bx, u = x - cx, v = y - cy;
  return { x: (by * u - ay * v) / det / 100, y: (-bx * u + ax * v) / det / 100 };
}

export interface Marker { l: string; c: string; x: number; y: number }
let markersP: Promise<Record<string, { markers: Marker[] }>> | null = null;
export const loadMarkers = () => (markersP ??= fetch("/maps/maps.json").then((r) => r.json()));
