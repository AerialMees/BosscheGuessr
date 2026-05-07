import type { GameZone, LatLngLiteral, RoundLocation } from "../types/game";
import { distanceMeters, randomPointInZone, zoneContainsPoint } from "./geo";
import { randomHeading } from "./random";
import { DEBUG_TOOLS_ENABLED } from "./env";

export const RANDOM_SEARCH_RADIUS_METERS = 100;
export const MAX_PANO_ATTEMPTS = 50;
export const MAX_RETURN_DISTANCE_FROM_RANDOM_POINT_METERS = 150;
const EMPEL_FALLBACK_RADIUS_METERS = 175;
const EMPEL_FALLBACK_AFTER_ATTEMPT = 25;
const SUSPICIOUS_ZONE_CENTER_BUFFER_METERS = 250;

export interface PanoSearchOptions {
  radiusMeters?: number;
  maxAttempts?: number;
  maxReturnDistanceMeters?: number;
  usedPanoIds?: Set<string>;
}

function debugStreetView(message: string, details: Record<string, unknown>): void {
  if (DEBUG_TOOLS_ENABLED) {
    console.debug(`[StreetView] ${message}`, details);
  }
}


export async function getPanoramaNear(location: LatLngLiteral, radius: number): Promise<google.maps.StreetViewPanoramaData | null> {
  const { StreetViewService, StreetViewSource } = (await google.maps.importLibrary("streetView")) as google.maps.StreetViewLibrary;
  const service = new StreetViewService();
  try {
    const response = await service.getPanorama({
      location,
      radius,
      source: StreetViewSource.OUTDOOR,
    });
    debugStreetView("lookup result", {
      seed: location,
      radius,
      status: "OK",
      panoId: response.data.location?.pano,
      actualLocation: response.data.location?.latLng?.toJSON(),
    });
    return response.data;
  } catch (error) {
    debugStreetView("lookup rejected", { seed: location, radius, status: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export function isPanoAcceptable(
  pano: google.maps.StreetViewPanoramaData,
  zone: GameZone,
  randomPoint: LatLngLiteral,
  options: Required<Pick<PanoSearchOptions, "maxReturnDistanceMeters">>,
): boolean {
  const latLng = pano.location?.latLng;
  const panoId = pano.location?.pano;
  if (!latLng || !panoId) return false;
  const actualLocation = latLng.toJSON();
  if (!zoneContainsPoint(zone, actualLocation)) return false;
  return distanceMeters(randomPoint, actualLocation) <= options.maxReturnDistanceMeters;
}

function maxUsefulDistanceFromZoneCenter(zone: GameZone): number {
  const farthestVertex = Math.max(...zone.polygon.map((point) => distanceMeters(zone.center, point)));
  return farthestVertex + SUSPICIOUS_ZONE_CENTER_BUFFER_METERS;
}

export async function findRandomPanoramaInZone(zone: GameZone, options: PanoSearchOptions = {}): Promise<RoundLocation> {
  const maxAttempts = options.maxAttempts ?? MAX_PANO_ATTEMPTS;
  const maxReturnDistanceMeters = options.maxReturnDistanceMeters ?? MAX_RETURN_DISTANCE_FROM_RANDOM_POINT_METERS;
  const usedPanoIds = options.usedPanoIds ?? new Set<string>();
  const maxCenterDistanceMeters = maxUsefulDistanceFromZoneCenter(zone);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const randomPoint = randomPointInZone(zone);
    const radiusMeters =
      options.radiusMeters ??
      (zone.id === "empel" && attempt > EMPEL_FALLBACK_AFTER_ATTEMPT ? EMPEL_FALLBACK_RADIUS_METERS : RANDOM_SEARCH_RADIUS_METERS);
    const pano = await getPanoramaNear(randomPoint, radiusMeters);
    const panoId = pano?.location?.pano;
    const actualLatLng = pano?.location?.latLng;

    if (!pano || !panoId || !actualLatLng) {
      debugStreetView("rejected panorama", { attempt, zone: zone.id, seed: randomPoint, reason: "no-result" });
      continue;
    }
    const actualLocation = actualLatLng.toJSON();
    if (usedPanoIds.has(panoId)) {
      debugStreetView("rejected panorama", { attempt, zone: zone.id, seed: randomPoint, panoId, actualLocation, reason: "duplicate" });
      continue;
    }
    if (!zoneContainsPoint(zone, actualLocation)) {
      debugStreetView("rejected panorama", { attempt, zone: zone.id, seed: randomPoint, panoId, actualLocation, reason: "outside-polygon" });
      continue;
    }
    const distanceFromSeed = distanceMeters(randomPoint, actualLocation);
    if (distanceFromSeed > maxReturnDistanceMeters) {
      debugStreetView("rejected panorama", {
        attempt,
        zone: zone.id,
        seed: randomPoint,
        panoId,
        actualLocation,
        distanceFromSeed,
        reason: "too-far-from-seed",
      });
      continue;
    }
    const distanceFromCenter = distanceMeters(zone.center, actualLocation);
    if (distanceFromCenter > maxCenterDistanceMeters) {
      debugStreetView("rejected panorama", {
        attempt,
        zone: zone.id,
        seed: randomPoint,
        panoId,
        actualLocation,
        distanceFromCenter,
        reason: "suspiciously-far-from-zone-center",
      });
      continue;
    }

    return {
      panoId,
      actualLocation,
      initialPov: { heading: randomHeading(), pitch: 0, zoom: 0 },
    };
  }

  throw new Error("Could not find a valid Street View panorama in the selected zone. Try again, increase the radius, or tune the town bounds.");
}
