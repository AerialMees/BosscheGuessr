import type { ConcreteZoneId, GameZone, ZoneId } from "../types/game";
import { getBoundsForPolygon } from "../lib/geo";

const gameplayBoundaryDisclaimer = "Gameplay polygon, not an official boundary. Manually tune after testing.";

const engelenPolygon = [
  { lat: 51.7283, lng: 5.2528 },
  { lat: 51.7286, lng: 5.2684 },
  { lat: 51.7243, lng: 5.2751 },
  { lat: 51.7168, lng: 5.2758 },
  { lat: 51.7135, lng: 5.2677 },
  { lat: 51.7144, lng: 5.2551 },
  { lat: 51.7196, lng: 5.2495 },
  { lat: 51.7251, lng: 5.2497 },
];

const empelPolygon = [
  { lat: 51.7357, lng: 5.3178 },
  { lat: 51.7361, lng: 5.3269 },
  { lat: 51.734, lng: 5.335 },
  { lat: 51.7301, lng: 5.3386 },
  { lat: 51.7258, lng: 5.3364 },
  { lat: 51.7239, lng: 5.3292 },
  { lat: 51.7248, lng: 5.3212 },
  { lat: 51.7289, lng: 5.3168 },
];

export const empelCorePolygon = [
  { lat: 51.7338, lng: 5.3202 },
  { lat: 51.7341, lng: 5.3287 },
  { lat: 51.7319, lng: 5.3344 },
  { lat: 51.7282, lng: 5.3346 },
  { lat: 51.7258, lng: 5.3296 },
  { lat: 51.7266, lng: 5.3225 },
  { lat: 51.7296, lng: 5.3191 },
];

const rosmalenPolygon = [
  { lat: 51.7303, lng: 5.342 },
  { lat: 51.731, lng: 5.369 },
  { lat: 51.7246, lng: 5.3896 },
  { lat: 51.7119, lng: 5.3972 },
  { lat: 51.7017, lng: 5.3865 },
  { lat: 51.6991, lng: 5.3608 },
  { lat: 51.7068, lng: 5.3413 },
  { lat: 51.7193, lng: 5.3366 },
];

const kerkdrielPolygon = [
  { lat: 51.7827, lng: 5.3188 },
  { lat: 51.783, lng: 5.3438 },
  { lat: 51.7774, lng: 5.3547 },
  { lat: 51.7668, lng: 5.3552 },
  { lat: 51.7598, lng: 5.3446 },
  { lat: 51.7592, lng: 5.3267 },
  { lat: 51.7665, lng: 5.3147 },
  { lat: 51.7766, lng: 5.3138 },
];

// These are approximate gameplay polygons, not official borders.
// TODO: Adjust these bounds manually after testing.
export const zones: Record<ConcreteZoneId, GameZone> = {
  engelen: {
    id: "engelen",
    displayName: "Engelen",
    center: { lat: 51.7212, lng: 5.2636 },
    polygon: engelenPolygon,
    bounds: getBoundsForPolygon(engelenPolygon),
    defaultZoom: 14,
    difficultyLabel: "Canal suburb chaos",
    notes: "Main village and nearby residential streets, avoiding too much open countryside.",
    gameplayBoundaryDisclaimer,
  },
  empel: {
    id: "empel",
    displayName: "Empel",
    center: { lat: 51.7308, lng: 5.3264 },
    polygon: empelPolygon,
    bounds: getBoundsForPolygon(empelPolygon),
    defaultZoom: 14,
    difficultyLabel: "Village edge mode",
    notes: "Tighter Empel gameplay area focused on the built-up village core.",
    gameplayBoundaryDisclaimer,
  },
  rosmalen: {
    id: "rosmalen",
    displayName: "Rosmalen",
    center: { lat: 51.7167, lng: 5.3652 },
    polygon: rosmalenPolygon,
    bounds: getBoundsForPolygon(rosmalenPolygon),
    defaultZoom: 13,
    difficultyLabel: "Suburban maze",
    notes: "Practical gameplay polygon around the main built-up area.",
    gameplayBoundaryDisclaimer,
  },
  kerkdriel: {
    id: "kerkdriel",
    displayName: "Kerkdriel",
    center: { lat: 51.7719, lng: 5.3335 },
    polygon: kerkdrielPolygon,
    bounds: getBoundsForPolygon(kerkdrielPolygon),
    defaultZoom: 13,
    difficultyLabel: "Across the Maas",
    notes: "Village and nearby residential roads, avoiding excessive waterfront/outskirt drift.",
    gameplayBoundaryDisclaimer,
  },
};

export const testingZones = {
  "empel-core": {
    id: "empel-core",
    displayName: "Empel Core",
    center: { lat: 51.7308, lng: 5.3264 },
    polygon: empelCorePolygon,
    bounds: getBoundsForPolygon(empelCorePolygon),
    defaultZoom: 15,
    difficultyLabel: "Very tight Empel",
    notes: "Optional stricter polygon for testing; not shown in the main selector.",
    gameplayBoundaryDisclaimer,
  },
} satisfies Record<string, GameZone>;

export const selectableZones: Array<{ id: ZoneId; displayName: string }> = [
  { id: "empel", displayName: "Empel" },
  { id: "rosmalen", displayName: "Rosmalen" },
  { id: "engelen", displayName: "Engelen" },
  { id: "kerkdriel", displayName: "Kerkdriel" },
  { id: "mixed", displayName: "Mixed Local Mode" },
];

export const concreteZoneIds = Object.keys(zones) as ConcreteZoneId[];
