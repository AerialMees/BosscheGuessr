export const MAX_ROUND_SCORE = 5000;
export const TIME_SCORE_REFERENCE_SECONDS = 60;

export function calculateScore(distanceMeters: number, scaleMeters = 400, timeRemainingSeconds?: number | null): number {
  const distanceScore = calculateDistanceScore(distanceMeters, scaleMeters);
  const score = Math.round(distanceScore * timeScoreMultiplier(timeRemainingSeconds));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function calculateDistanceScore(distanceMeters: number, scaleMeters = 400): number {
  const score = Math.round(MAX_ROUND_SCORE * Math.exp(-Math.max(0, distanceMeters) / scaleMeters));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function timeScoreMultiplier(timeRemainingSeconds?: number | null): number {
  if (timeRemainingSeconds === undefined || timeRemainingSeconds === null) return 1;
  return Math.min(1, Math.max(0, timeRemainingSeconds / TIME_SCORE_REFERENCE_SECONDS));
}

export function scoringScaleForZone(zoneId: string, selectedZoneId: string): number {
  if (selectedZoneId === "mixed") return 1000;
  const scaleByZone: Record<string, number> = {
    empel: 450,
    engelen: 550,
    rosmalen: 850,
    kerkdriel: 750,
    "den-bosch": 1100,
  };
  return scaleByZone[zoneId] ?? 600;
}
