import type { LeaderboardEntry } from "../types/game";

const STORAGE_KEY = "boschguessr.leaderboard.v1";

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as LeaderboardEntry[];
    return sortLeaderboard(Array.isArray(entries) ? entries : []);
  } catch {
    return [];
  }
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = sortLeaderboard([...getLeaderboard(), entry]).slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
}

export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.totalDistanceMeters - b.totalDistanceMeters;
  });
}

export function createLeaderboardEntry(input: Omit<LeaderboardEntry, "id" | "dateIso" | "percentage" | "maxPossibleScore" | "totalDistanceMeters">): LeaderboardEntry {
  const maxPossibleScore = input.rounds * 5000;
  const totalDistanceMeters = input.roundResults.reduce((sum, round) => sum + round.distanceMeters, 0);
  return {
    ...input,
    id: crypto.randomUUID(),
    dateIso: new Date().toISOString(),
    maxPossibleScore,
    percentage: Math.round((input.totalScore / maxPossibleScore) * 1000) / 10,
    totalDistanceMeters,
  };
}
