import { describe, expect, it } from "vitest";
import { clampTimedViewSeconds, modes } from "./modes";

describe("modes", () => {
  it("includes arcade mode configs", () => {
    expect(modes["timed-view"].hideStreetViewAfterTime).toBe(true);
  });

  it("clamps timed view seconds", () => {
    expect(clampTimedViewSeconds(0)).toBe(0.1);
    expect(clampTimedViewSeconds(10.44)).toBe(10.4);
    expect(clampTimedViewSeconds(10.46)).toBe(10.5);
    expect(clampTimedViewSeconds(100)).toBe(60);
  });
});
