import type { ConcreteZoneId, LatLngLiteral } from "../types/game";

export type BikePathSeed = {
  id: string;
  zoneId: ConcreteZoneId;
  label?: string;
  location: LatLngLiteral;
  tags: string[];
  notes?: string;
};

// TODO: Tune these approximate bike-friendly seed points after local playtesting.
export const BIKE_PATH_SEEDS: BikePathSeed[] = [
  { id: "engelen-dike-1", zoneId: "engelen", label: "Engelen dike area", location: { lat: 51.7248, lng: 5.2538 }, tags: ["bike", "dike", "quiet"], notes: "Approximate seed; Street View result is validated against zone polygon." },
  { id: "engelen-edge-1", zoneId: "engelen", label: "Engelen west edge", location: { lat: 51.721, lng: 5.2515 }, tags: ["bike", "quiet"] },
  { id: "engelen-green-1", zoneId: "engelen", label: "Engelen green route", location: { lat: 51.7172, lng: 5.2605 }, tags: ["bike", "green"] },
  { id: "empel-core-1", zoneId: "empel", label: "Empel quiet route", location: { lat: 51.7331, lng: 5.3218 }, tags: ["bike", "quiet"] },
  { id: "empel-edge-1", zoneId: "empel", label: "Empel east route", location: { lat: 51.7312, lng: 5.3351 }, tags: ["bike", "residential"] },
  { id: "empel-south-1", zoneId: "empel", label: "Empel south route", location: { lat: 51.7278, lng: 5.331 }, tags: ["bike", "quiet"] },
  { id: "rosmalen-east-1", zoneId: "rosmalen", label: "Rosmalen east", location: { lat: 51.7216, lng: 5.3835 }, tags: ["bike", "green"] },
  { id: "rosmalen-south-1", zoneId: "rosmalen", label: "Rosmalen south", location: { lat: 51.7115, lng: 5.3905 }, tags: ["bike", "quiet"] },
  { id: "rosmalen-west-1", zoneId: "rosmalen", label: "Rosmalen west", location: { lat: 51.705, lng: 5.3588 }, tags: ["bike", "residential"] },
  { id: "kerkdriel-north-1", zoneId: "kerkdriel", label: "Kerkdriel north", location: { lat: 51.779, lng: 5.3268 }, tags: ["bike", "dike"] },
  { id: "kerkdriel-east-1", zoneId: "kerkdriel", label: "Kerkdriel east", location: { lat: 51.7752, lng: 5.3504 }, tags: ["bike", "quiet"] },
  { id: "kerkdriel-south-1", zoneId: "kerkdriel", label: "Kerkdriel south", location: { lat: 51.7637, lng: 5.3388 }, tags: ["bike", "green"] },
  { id: "den-bosch-west-1", zoneId: "den-bosch", label: "Bossche Broek edge", location: { lat: 51.6945, lng: 5.287 }, tags: ["bike", "urban", "green"] },
  { id: "den-bosch-north-1", zoneId: "den-bosch", label: "Urban north route", location: { lat: 51.7041, lng: 5.317 }, tags: ["bike", "urban"] },
  { id: "den-bosch-south-1", zoneId: "den-bosch", label: "South green route", location: { lat: 51.6856, lng: 5.3382 }, tags: ["bike", "green"] },
  { id: "den-bosch-center-1", zoneId: "den-bosch", label: "City edge route", location: { lat: 51.7125, lng: 5.2942 }, tags: ["bike", "urban"] },
];

export function getBikePathSeedsForZone(zoneId: ConcreteZoneId): BikePathSeed[] {
  return BIKE_PATH_SEEDS.filter((seed) => seed.zoneId === zoneId);
}
