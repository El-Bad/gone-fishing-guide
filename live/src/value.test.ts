import { describe, expect, it } from "vitest";
import { baseGold, catchGold, JW_MULT } from "./value";

describe("gold value", () => {
  it("knows every species", () => {
    for (const f of ["Perch", "Wels Catfish", "Megalodon", "Rhizodus", "Lochness Monster"]) expect(baseGold(f, 10)).not.toBeNull();
  });
  it("matches the site's per-catch values (bonus 1.05 x day bonus)", () => {
    // checked against gonefishing.gg's own calculator on real catches
    expect(catchGold({ fish: "Sturgeon", weight: 114.12, mult: 1.05 * 1.0381356 })!).toBeCloseTo(39.197, 0);
    expect(catchGold({ fish: "Shortfin Mako", weight: 152.7, mult: 1.05 * 1.0338984 })!).toBeCloseTo(16.927, 0);
  });
  it("grows with weight and caps at the species max", () => {
    expect(baseGold("Red Drum", 50)!).toBeGreaterThan(baseGold("Red Drum", 5)!);
    expect(baseGold("Megalodon", 1e7)).toBe(3996);
  });
  it("Jeremy Wade multiplier", () => expect(JW_MULT).toBe(1.25));
});
