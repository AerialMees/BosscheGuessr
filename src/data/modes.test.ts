import { describe, expect, it } from "vitest";
import { clampTimedViewSeconds, modes } from "./modes";

describe("modes", () => {
  it("includes arcade mode configs", () => {
    expect(modes["bike-paths"].usesBikePathSeeds).toBe(true);
    expect(modes["timed-view"].hideStreetViewAfterTime).toBe(true);
  });

  it("clamps timed view seconds", () => {
    expect(clampTimedViewSeconds(1)).toBe(3);
    expect(clampTimedViewSeconds(10.4)).toBe(10);
    expect(clampTimedViewSeconds(100)).toBe(60);
  });
});
