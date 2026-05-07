import type { BoundsLiteral, GameZone, LatLngLiteral } from "../types/game";
import { randomBetween } from "./random";

const EARTH_RADIUS_METERS = 6_371_000;

export function randomPointInBounds(bounds: BoundsLiteral): LatLngLiteral {
  return {
    lat: randomBetween(bounds.south, bounds.north),
    lng: randomBetween(bounds.west, bounds.east),
  };
}

export function isPointInBounds(point: LatLngLiteral, bounds: BoundsLiteral): boolean {
  return point.lat <= bounds.north && point.lat >= bounds.south && point.lng <= bounds.east && point.lng >= bounds.west;
}

export function isPointInPolygon(point: LatLngLiteral, polygon: LatLngLiteral[]): boolean {
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

export function zoneContainsPoint(zone: GameZone, point: LatLngLiteral): boolean {
  if (!isPointInBounds(point, zone.bounds)) return false;
  return zone.polygon ? isPointInPolygon(point, zone.polygon) : true;
}

export function randomPointInZone(zone: GameZone): LatLngLiteral {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const point = randomPointInBounds(zone.bounds);
    if (zoneContainsPoint(zone, point)) return point;
  }
  return zone.center;
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
