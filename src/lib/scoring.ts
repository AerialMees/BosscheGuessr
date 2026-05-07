export const MAX_ROUND_SCORE = 5000;

export function calculateScore(distanceMeters: number, mixedMode = false): number {
  const scale = mixedMode ? 800 : 400;
  const score = Math.round(MAX_ROUND_SCORE * Math.exp(-Math.max(0, distanceMeters) / scale));
  return Math.min(MAX_ROUND_SCORE, Math.max(0, score));
}

export function ratingForDistance(distanceMeters: number): string {
  if (distanceMeters <= 25) return "Street wizard";
  if (distanceMeters <= 75) return "Local menace";
  if (distanceMeters <= 200) return "Very solid";
  if (distanceMeters <= 500) return "You know the area";
  if (distanceMeters <= 1000) return "Close-ish";
  return "Tourist energy";
}

export function resultFlavor(distanceMeters: number, zoneName: string): string {
  if (distanceMeters <= 25) return "Insane local knowledge!";
  if (distanceMeters <= 75) return "Almost there!";
  if (distanceMeters <= 200) return `${zoneName} cannot hide from you.`;
  if (distanceMeters <= 500) return "Respectable. The locals are nervous.";
  if (distanceMeters <= 1000) return "Close-ish, but the street signs are laughing.";
  return `You ended up in a ditch near ${zoneName}.`;
}
