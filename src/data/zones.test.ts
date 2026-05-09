import { describe, expect, it } from "vitest";
import { zones } from "./zones";
import { distanceMeters, getBoundsForPolygon, isPointInBounds, isPointInPolygon, randomPointInPolygon, zoneContainsPoint } from "../lib/geo";
import { isPanoAcceptable } from "../lib/streetView";
import type { LatLngLiteral } from "../types/game";

describe("zone boundaries", () => {
  it("defines valid polygons and metadata for every playable zone", () => {
    for (const zone of Object.values(zones)) {
      expect(zone.polygon.length).toBeGreaterThanOrEqual(3);
      expect(zone.boundarySource).toBeTruthy();
      expect(zone.boundaryAccuracy).toBeTruthy();
      expect(zone.boundaryNotes.length).toBeGreaterThan(20);
      for (const point of zone.polygon) {
        expect(point.lat).toBeGreaterThanOrEqual(-90);
        expect(point.lat).toBeLessThanOrEqual(90);
        expect(point.lng).toBeGreaterThanOrEqual(-180);
        expect(point.lng).toBeLessThanOrEqual(180);
      }
    }
  });

  it("has centers inside or very near each polygon", () => {
    for (const zone of Object.values(zones)) {
      if (isPointInPolygon(zone.center, zone.polygon)) continue;
      const nearestVertexMeters = Math.min(...zone.polygon.map((point) => distanceMeters(zone.center, point)));
      expect(nearestVertexMeters).toBeLessThan(600);
    }
  });

  it("generates random points inside each zone polygon", () => {
    for (const zone of Object.values(zones)) {
      for (let index = 0; index < 10; index += 1) {
        const point = randomPointInPolygon(zone.polygon);
        expect(zoneContainsPoint(zone, point)).toBe(true);
      }
    }
  });

  it("computes valid bounds for each zone", () => {
    for (const zone of Object.values(zones)) {
      const bounds = getBoundsForPolygon(zone.polygon);
      expect(bounds.north).toBeGreaterThan(bounds.south);
      expect(bounds.east).toBeGreaterThan(bounds.west);
      expect(zone.polygon.every((point) => isPointInBounds(point, bounds))).toBe(true);
    }
  });

  it("keeps Den Bosch broad but not municipality-sized", () => {
    const bounds = getBoundsForPolygon(zones["den-bosch"].polygon);
    expect(distanceMeters({ lat: bounds.south, lng: bounds.west }, { lat: bounds.north, lng: bounds.east })).toBeLessThan(10_000);
  });

  it("keeps Empel much tighter than Den Bosch", () => {
    const denBoschBounds = getBoundsForPolygon(zones["den-bosch"].polygon);
    const empelBounds = getBoundsForPolygon(zones.empel.polygon);
    const denBoschSpan = distanceMeters({ lat: denBoschBounds.south, lng: denBoschBounds.west }, { lat: denBoschBounds.north, lng: denBoschBounds.east });
    const empelSpan = distanceMeters({ lat: empelBounds.south, lng: empelBounds.west }, { lat: empelBounds.north, lng: empelBounds.east });
    expect(empelSpan).toBeLessThan(denBoschSpan * 0.4);
  });

  it("accepts Street View panos only inside the selected polygon", () => {
    const zone = zones.empel;
    const inside = makePano({ lat: 51.7308, lng: 5.3264 });
    const outside = makePano({ lat: 51.742, lng: 5.35 });
    expect(isPanoAcceptable(inside, zone, zone.center, { maxReturnDistanceMeters: 200 })).toBe(true);
    expect(isPanoAcceptable(outside, zone, zone.center, { maxReturnDistanceMeters: 5000 })).toBe(false);
  });
});

function makePano(location: LatLngLiteral): google.maps.StreetViewPanoramaData {
  return {
    location: {
      pano: `test-${location.lat}-${location.lng}`,
      latLng: { toJSON: () => location } as google.maps.LatLng,
    },
  } as google.maps.StreetViewPanoramaData;
}
