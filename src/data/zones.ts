import type { ConcreteZoneId, GameZone, ZoneId } from "../types/game";

// TODO: Adjust these bounds manually after testing.
export const zones: Record<ConcreteZoneId, GameZone> = {
  engelen: {
    id: "engelen",
    displayName: "Engelen",
    center: { lat: 51.719, lng: 5.266 },
    bounds: { north: 51.728, south: 51.708, east: 5.286, west: 5.245 },
    defaultZoom: 14,
    difficultyLabel: "Canal suburb chaos",
    notes: "TODO: Adjust these bounds manually after testing.",
  },
  empel: {
    id: "empel",
    displayName: "Empel",
    center: { lat: 51.731, lng: 5.326 },
    bounds: { north: 51.741, south: 51.719, east: 5.348, west: 5.304 },
    defaultZoom: 14,
    difficultyLabel: "Village edge mode",
    notes: "TODO: Adjust these bounds manually after testing.",
  },
  rosmalen: {
    id: "rosmalen",
    displayName: "Rosmalen",
    center: { lat: 51.716, lng: 5.366 },
    bounds: { north: 51.744, south: 51.69, east: 5.414, west: 5.323 },
    defaultZoom: 13,
    difficultyLabel: "Suburban maze",
    notes: "TODO: Adjust these bounds manually after testing.",
  },
  kerkdriel: {
    id: "kerkdriel",
    displayName: "Kerkdriel",
    center: { lat: 51.771, lng: 5.333 },
    bounds: { north: 51.789, south: 51.753, east: 5.37, west: 5.295 },
    defaultZoom: 13,
    difficultyLabel: "Across the Maas",
    notes: "TODO: Adjust these bounds manually after testing.",
  },
};

export const selectableZones: Array<{ id: ZoneId; displayName: string }> = [
  { id: "empel", displayName: "Empel" },
  { id: "rosmalen", displayName: "Rosmalen" },
  { id: "engelen", displayName: "Engelen" },
  { id: "kerkdriel", displayName: "Kerkdriel" },
  { id: "mixed", displayName: "Mixed Local Mode" },
];

export const concreteZoneIds = Object.keys(zones) as ConcreteZoneId[];
