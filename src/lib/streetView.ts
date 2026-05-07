import type { GameZone, LatLngLiteral, RoundLocation } from "../types/game";
import { distanceMeters, randomPointInZone, zoneContainsPoint } from "./geo";
import { randomHeading } from "./random";

export const RANDOM_SEARCH_RADIUS_METERS = 100;
export const MAX_PANO_ATTEMPTS = 40;
export const MAX_RETURN_DISTANCE_FROM_RANDOM_POINT_METERS = 150;

export interface PanoSearchOptions {
  radiusMeters?: number;
  maxAttempts?: number;
  maxReturnDistanceMeters?: number;
  usedPanoIds?: Set<string>;
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
    return response.data;
  } catch (error) {
    console.debug("Street View lookup rejected", { location, error });
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

export async function findRandomPanoramaInZone(zone: GameZone, options: PanoSearchOptions = {}): Promise<RoundLocation> {
  const radiusMeters = options.radiusMeters ?? RANDOM_SEARCH_RADIUS_METERS;
  const maxAttempts = options.maxAttempts ?? MAX_PANO_ATTEMPTS;
  const maxReturnDistanceMeters = options.maxReturnDistanceMeters ?? MAX_RETURN_DISTANCE_FROM_RANDOM_POINT_METERS;
  const usedPanoIds = options.usedPanoIds ?? new Set<string>();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const randomPoint = randomPointInZone(zone);
    const pano = await getPanoramaNear(randomPoint, radiusMeters);
    const panoId = pano?.location?.pano;
    const actualLatLng = pano?.location?.latLng;

    if (!pano || !panoId || !actualLatLng) {
      console.debug("Rejected panorama: no result", { attempt, zone: zone.id });
      continue;
    }
    if (usedPanoIds.has(panoId)) {
      console.debug("Rejected panorama: duplicate", { attempt, panoId });
      continue;
    }
    if (!isPanoAcceptable(pano, zone, randomPoint, { maxReturnDistanceMeters })) {
      console.debug("Rejected panorama: outside zone or too far", { attempt, panoId, randomPoint });
      continue;
    }

    return {
      panoId,
      actualLocation: actualLatLng.toJSON(),
      initialPov: { heading: randomHeading(), pitch: 0, zoom: 0 },
    };
  }

  throw new Error("Could not find a valid Street View panorama in the selected zone. Try again, increase the radius, or tune the town bounds.");
}
