export const MAX_ROUND_SCORE = 5000;
export const TIME_SCORE_REFERENCE_SECONDS = 60;

export function calculateScore(distanceMeters, scaleMeters = 400, timeRemainingSeconds) {
  const distanceScore = calculateDistanceScore(distanceMeters, scaleMeters);
  const score = Math.round(distanceScore * timeScoreMultiplier(timeRemainingSeconds));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function calculateDistanceScore(distanceMeters, scaleMeters = 400) {
  const score = Math.round(MAX_ROUND_SCORE * Math.exp(-Math.max(0, distanceMeters) / scaleMeters));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function timeScoreMultiplier(timeRemainingSeconds) {
  if (timeRemainingSeconds === undefined || timeRemainingSeconds === null) return 1;
  return Math.min(1, Math.max(0, timeRemainingSeconds / TIME_SCORE_REFERENCE_SECONDS));
}

export function scoringScaleForZone(zoneId, selectedZoneId) {
  if (selectedZoneId === "mixed") return 1000;
  const scaleByZone = {
    empel: 450,
    engelen: 550,
    rosmalen: 850,
    kerkdriel: 750,
    "den-bosch": 1100,
  };
  return scaleByZone[zoneId] ?? 600;
}
