import type { LatLngLiteral } from "./types";

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const phi1 = degreesToRadians(a.lat);
  const phi2 = degreesToRadians(b.lat);
  const deltaPhi = degreesToRadians(b.lat - a.lat);
  const deltaLambda = degreesToRadians(b.lng - a.lng);
  const h = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
