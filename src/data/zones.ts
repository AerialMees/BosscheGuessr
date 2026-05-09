import type { ConcreteZoneId, GameZone, ZoneId } from "../types/game";
import { getBoundsForPolygon } from "../lib/geo";

const gameplayBoundaryDisclaimer = "Gameplay polygon, not an official boundary. Manually tune after testing.";
const osmBoundaryNote = "Boundary is based on OSM/place research, then gameplay-tuned to keep rounds in the recognizable built-up area.";
const manualBoundaryNote = "No clean village administrative polygon was reliable enough for gameplay; this is a GPS-defined gameplay polygon with source notes.";

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

const denBoschPolygon = [
  { lat: 51.7248, lng: 5.2602 },
  { lat: 51.7241, lng: 5.3235 },
  { lat: 51.7129, lng: 5.3524 },
  { lat: 51.6925, lng: 5.3621 },
  { lat: 51.6711, lng: 5.3453 },
  { lat: 51.6608, lng: 5.3136 },
  { lat: 51.6635, lng: 5.2765 },
  { lat: 51.681, lng: 5.2492 },
  { lat: 51.7057, lng: 5.2466 },
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
    scoringScaleMeters: 550,
    notes: "Main village and nearby residential streets, avoiding too much open countryside.",
    gameplayBoundaryDisclaimer,
    boundarySource: "manual-gameplay-polygon",
    boundaryAccuracy: "gameplay",
    boundaryNotes: `${manualBoundaryNote} Engelen is treated as a local village/neighbourhood game area rather than a municipal boundary.`,
    sourceUrl: "https://www.openstreetmap.org/search?query=Engelen%2C%20%27s-Hertogenbosch",
  },
  empel: {
    id: "empel",
    displayName: "Empel",
    center: { lat: 51.7308, lng: 5.3264 },
    polygon: empelPolygon,
    bounds: getBoundsForPolygon(empelPolygon),
    defaultZoom: 14,
    difficultyLabel: "Village edge mode",
    scoringScaleMeters: 450,
    notes: "Tighter Empel gameplay area focused on the built-up village core.",
    gameplayBoundaryDisclaimer,
    boundarySource: "manual-gameplay-polygon",
    boundaryAccuracy: "gameplay",
    boundaryNotes: `${manualBoundaryNote} Empel is intentionally constrained to avoid Gewande, Oud-Empel outskirts, farmland, and long dike drift.`,
    sourceUrl: "https://www.openstreetmap.org/search?query=Empel%2C%20%27s-Hertogenbosch",
  },
  rosmalen: {
    id: "rosmalen",
    displayName: "Rosmalen",
    center: { lat: 51.7167, lng: 5.3652 },
    polygon: rosmalenPolygon,
    bounds: getBoundsForPolygon(rosmalenPolygon),
    defaultZoom: 13,
    difficultyLabel: "Suburban maze",
    scoringScaleMeters: 850,
    notes: "Practical gameplay polygon around the main built-up area.",
    gameplayBoundaryDisclaimer,
    boundarySource: "osm-place-boundary",
    boundaryAccuracy: "osm-derived",
    boundaryNotes: `${osmBoundaryNote} Rosmalen is larger than the villages, so the polygon follows the main urban area and avoids broad rural edges.`,
    sourceUrl: "https://www.openstreetmap.org/search?query=Rosmalen",
  },
  kerkdriel: {
    id: "kerkdriel",
    displayName: "Kerkdriel",
    center: { lat: 51.7719, lng: 5.3335 },
    polygon: kerkdrielPolygon,
    bounds: getBoundsForPolygon(kerkdrielPolygon),
    defaultZoom: 13,
    difficultyLabel: "Across the Maas",
    scoringScaleMeters: 750,
    notes: "Village and nearby residential roads, avoiding excessive waterfront/outskirt drift.",
    gameplayBoundaryDisclaimer,
    boundarySource: "osm-place-boundary",
    boundaryAccuracy: "osm-derived",
    boundaryNotes: `${osmBoundaryNote} Kerkdriel is kept to village/residential play and avoids too much campsite or waterfront edge area.`,
    sourceUrl: "https://www.openstreetmap.org/search?query=Kerkdriel",
  },
  "den-bosch": {
    id: "den-bosch",
    displayName: "Den Bosch",
    center: { lat: 51.6978, lng: 5.3037 },
    polygon: denBoschPolygon,
    bounds: getBoundsForPolygon(denBoschPolygon),
    defaultZoom: 13,
    difficultyLabel: "Urban arcade sprawl",
    scoringScaleMeters: 1100,
    notes: "Approximate gameplay polygon for the main urban area of Den Bosch; not an official boundary.",
    gameplayBoundaryDisclaimer,
    boundarySource: "imported-geojson",
    boundaryAccuracy: "gameplay",
    boundaryNotes: "Den Bosch municipality boundaries are too broad for this game, so this is a GPS-defined urban gameplay polygon derived from local OSM/map context and tuned to avoid far villages.",
    sourceUrl: "https://www.openstreetmap.org/relation/182993",
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
    scoringScaleMeters: 350,
    notes: "Optional stricter polygon for testing; not shown in the main selector.",
    gameplayBoundaryDisclaimer,
    boundarySource: "manual-gameplay-polygon",
    boundaryAccuracy: "gameplay",
    boundaryNotes: "Extra tight Empel core polygon for testing highly constrained rounds.",
  },
} satisfies Record<string, GameZone>;

export const selectableZones: Array<{ id: ZoneId; displayName: string }> = [
  { id: "empel", displayName: "Empel" },
  { id: "rosmalen", displayName: "Rosmalen" },
  { id: "engelen", displayName: "Engelen" },
  { id: "kerkdriel", displayName: "Kerkdriel" },
  { id: "den-bosch", displayName: "Den Bosch" },
  { id: "mixed", displayName: "Mixed Local Mode" },
];

export const concreteZoneIds = Object.keys(zones) as ConcreteZoneId[];
