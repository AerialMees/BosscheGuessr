import { describe, expect, it } from "vitest";
import { clampVolume } from "./sound";

describe("sound helpers", () => {
  it("clamps volume to a safe range", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.4)).toBe(0.4);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0.25);
  });
});
