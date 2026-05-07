import type { BoundsLiteral, GameZone, LatLngLiteral } from "../types/game";
import { randomBetween } from "./random";

const EARTH_RADIUS_METERS = 6_371_000;

export function randomPointInBounds(bounds: BoundsLiteral): LatLngLiteral {
  return {
    lat: randomBetween(bounds.south, bounds.north),
    lng: randomBetween(bounds.west, bounds.east),
  };
}

export function getBoundsForPolygon(polygon: LatLngLiteral[]): BoundsLiteral {
  if (polygon.length === 0) {
    throw new Error("Cannot compute bounds for an empty polygon");
  }

  return polygon.reduce<BoundsLiteral>(
    (bounds, point) => ({
      north: Math.max(bounds.north, point.lat),
      south: Math.min(bounds.south, point.lat),
      east: Math.max(bounds.east, point.lng),
      west: Math.min(bounds.west, point.lng),
    }),
    {
      north: polygon[0].lat,
      south: polygon[0].lat,
      east: polygon[0].lng,
      west: polygon[0].lng,
    },
  );
}

export function isPointInBounds(point: LatLngLiteral, bounds: BoundsLiteral): boolean {
  return point.lat <= bounds.north && point.lat >= bounds.south && point.lng <= bounds.east && point.lng >= bounds.west;
}

export function isPointInPolygon(point: LatLngLiteral, polygon: LatLngLiteral[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function randomPointInPolygon(polygon: LatLngLiteral[], maxAttempts = 1000): LatLngLiteral {
  const bounds = getBoundsForPolygon(polygon);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = randomPointInBounds(bounds);
    if (isPointInPolygon(candidate, polygon)) return candidate;
  }

  throw new Error("Could not generate random point inside polygon");
}

export function zoneContainsPoint(zone: GameZone, point: LatLngLiteral): boolean {
  const bounds = zone.bounds ?? getBoundsForPolygon(zone.polygon);
  if (!isPointInBounds(point, bounds)) return false;
  return isPointInPolygon(point, zone.polygon);
}

export function randomPointInZone(zone: GameZone): LatLngLiteral {
  return randomPointInPolygon(zone.polygon);
}

export function distanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const maps = globalThis.google?.maps;
  if (maps?.geometry?.spherical) {
    return maps.geometry.spherical.computeDistanceBetween(new maps.LatLng(a), new maps.LatLng(b));
  }

  const phi1 = degreesToRadians(a.lat);
  const phi2 = degreesToRadians(b.lat);
  const deltaPhi = degreesToRadians(b.lat - a.lat);
  const deltaLambda = degreesToRadians(b.lng - a.lng);
  const h =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
