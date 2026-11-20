import { expect, it } from "vitest";
import { BAIT_SCORE, FISH, tierLabel } from "./gameData";

it("parses all 110 fish with tiers", () => {
  expect(Object.keys(FISH)).toHaveLength(110);
  expect(FISH["Perch"].tier).toBe("c");
  expect(FISH["Sturgeon"].tier).toBe("m");
  expect(tierLabel("Megalodon")).toBe("Legendary+");
  expect(tierLabel("Snake Head")).toBe("Common");
  expect(BAIT_SCORE["sleeping troll ragdoll"]).toBe(86);
});
