import { describe, expect, it } from "vitest";
import { BIKE_PATH_SEEDS, getBikePathSeedsForZone } from "./bikePathSeeds";
import { concreteZoneIds } from "./zones";

describe("bike path seeds", () => {
  it("has at least one seed for every playable zone", () => {
    for (const zoneId of concreteZoneIds) {
      expect(getBikePathSeedsForZone(zoneId).length).toBeGreaterThan(0);
    }
  });

  it("filters seeds by zone", () => {
    expect(getBikePathSeedsForZone("den-bosch").every((seed) => seed.zoneId === "den-bosch")).toBe(true);
    expect(BIKE_PATH_SEEDS.length).toBeGreaterThan(getBikePathSeedsForZone("empel").length);
  });
});
