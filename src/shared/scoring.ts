export const MAX_ROUND_SCORE = 5000;

export function calculateScore(distanceMeters: number, scaleMeters = 400): number {
  const score = Math.round(MAX_ROUND_SCORE * Math.exp(-Math.max(0, distanceMeters) / scaleMeters));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function scoringScaleForZone(zoneId: string, selectedZoneId: string): number {
  if (selectedZoneId === "mixed") return 1000;
  if (zoneId === "den-bosch") return 1000;
  return 400;
}
