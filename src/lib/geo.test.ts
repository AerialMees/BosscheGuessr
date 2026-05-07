import { describe, expect, it } from "vitest";
import { distanceMeters, getBoundsForPolygon, isPointInBounds, isPointInPolygon, randomPointInPolygon } from "./geo";

describe("geo helpers", () => {
  it("checks rectangular bounds", () => {
    const bounds = { north: 2, south: 0, east: 2, west: 0 };
    expect(isPointInBounds({ lat: 1, lng: 1 }, bounds)).toBe(true);
    expect(isPointInBounds({ lat: 3, lng: 1 }, bounds)).toBe(false);
  });

  it("checks polygon containment", () => {
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
    ];
    expect(isPointInPolygon({ lat: 1, lng: 1 }, polygon)).toBe(true);
    expect(isPointInPolygon({ lat: 3, lng: 1 }, polygon)).toBe(false);
  });

  it("computes polygon bounds", () => {
    const polygon = [
      { lat: 1, lng: 4 },
      { lat: -2, lng: 3 },
      { lat: 5, lng: -1 },
    ];

    expect(getBoundsForPolygon(polygon)).toEqual({ north: 5, south: -2, east: 4, west: -1 });
  });

  it("generates random points inside a polygon", () => {
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];

    for (let i = 0; i < 20; i += 1) {
      const point = randomPointInPolygon(polygon);
      expect(isPointInPolygon(point, polygon)).toBe(true);
    }
  });

  it("computes approximate haversine distance", () => {
    const meters = distanceMeters({ lat: 51.7, lng: 5.3 }, { lat: 51.701, lng: 5.3 });
    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(120);
  });
});
