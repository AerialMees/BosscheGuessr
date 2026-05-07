import { describe, expect, it } from "vitest";
import { calculateScore, ratingForDistance } from "./scoring";

describe("calculateScore", () => {
  it("awards max points for a perfect guess", () => {
    expect(calculateScore(0)).toBe(5000);
  });

  it("decays as distance grows", () => {
    expect(calculateScore(50)).toBeGreaterThan(calculateScore(500));
  });

  it("uses a gentler mixed-mode scale", () => {
    expect(calculateScore(500, true)).toBeGreaterThan(calculateScore(500, false));
  });

  it("accepts explicit larger zone scoring scales", () => {
    expect(calculateScore(500, 1000)).toBeGreaterThan(calculateScore(500, 400));
  });
});

describe("ratingForDistance", () => {
  it("labels close and distant guesses", () => {
    expect(ratingForDistance(20)).toBe("Street wizard");
    expect(ratingForDistance(1200)).toBe("Tourist energy");
  });
});
