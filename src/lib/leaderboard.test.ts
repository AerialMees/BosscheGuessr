import { describe, expect, it } from "vitest";
import { createLeaderboardEntry } from "./leaderboard";

describe("leaderboard", () => {
  it("keeps timed view metadata", () => {
    const entry = createLeaderboardEntry({
      playerName: "PLAYER 1",
      totalScore: 4200,
      mode: "timed-view",
      zone: "den-bosch",
      rounds: 1,
      viewSeconds: 7,
      roundResults: [{ roundNumber: 1, zoneId: "den-bosch", distanceMeters: 123, score: 4200 }],
    });

    expect(entry.viewSeconds).toBe(7);
    expect(entry.totalDistanceMeters).toBe(123);
  });
});
