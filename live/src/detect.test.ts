import { describe, expect, it } from "vitest";
import { evidence, fitsMyState, sessionStartFrom, verdict, type Pt } from "./detect";

const min = 60_000;
const J = "The Jungle", L = "The Lake";
// me: jungle day 3 for 20 min, then day 4
const mine: Pt[] = [
  { at: 0, map: J, day: 3 }, { at: 8 * min, map: J, day: 3 }, { at: 16 * min, map: J, day: 3 },
  { at: 24 * min, map: J, day: 4 }, { at: 30 * min, map: J, day: 4 }, { at: 38 * min, map: J, day: 4 },
];

describe("fitsMyState", () => {
  it("matches same map + day near my catches", () => expect(fitsMyState(mine, { at: 5 * min, map: J, day: 3 })).toBe(true));
  it("accepts either side of my day change", () => expect(fitsMyState(mine, { at: 20 * min, map: J, day: 4 })).toBe(true));
  it("rejects a different map", () => expect(fitsMyState(mine, { at: 5 * min, map: L, day: 3 })).toBe(false));
  it("is unknown far from my catches", () => expect(fitsMyState(mine, { at: 200 * min, map: J, day: 4 })).toBeNull());
});

describe("verdict", () => {
  it("crewmate in lockstep across a day change is likely", () => {
    const mate: Pt[] = [2, 10, 14, 26, 33].map((m) => ({ at: m * min, map: J, day: m < 22 ? 3 : 4 }));
    expect(verdict(evidence(mine, mate))).toBe("likely");
  });
  it("stranger sharing map+day only before my day change stays possible at most", () => {
    const stranger: Pt[] = [{ at: 3 * min, map: J, day: 3 }, { at: 12 * min, map: J, day: 3 }, { at: 30 * min, map: J, day: 3 }, { at: 36 * min, map: J, day: 3 }];
    expect(verdict(evidence(mine, stranger))).not.toBe("likely");
  });
  it("someone elsewhere is no", () => {
    expect(verdict(evidence(mine, [{ at: 5 * min, map: L, day: 9 }, { at: 9 * min, map: L, day: 9 }]))).toBe("no");
  });
});

describe("sessionStartFrom", () => {
  it("finds the first catch after the last long break", () => {
    const t = [0, 10 * min, 20 * min, 200 * min, 210 * min, 230 * min];
    expect(sessionStartFrom(t)).toBe(200 * min);
  });
});
