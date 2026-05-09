import { useEffect, useRef, useState } from "react";
import { zones } from "../data/zones";
import { getBoundsForPolygon } from "../lib/geo";
import { DEBUG_TOOLS_ENABLED } from "../lib/env";
import type { ConcreteZoneId, LatLngLiteral } from "../types/game";
import { RetroButton } from "./RetroButton";

interface GuessMapProps {
  zoneId: ConcreteZoneId;
  guessLocation?: LatLngLiteral;
  actualLocation?: LatLngLiteral;
  onGuessChange: (location: LatLngLiteral) => void;
  onSubmit: () => void;
  resultMode?: boolean;
}

export function GuessMap({ zoneId, guessLocation, actualLocation, onGuessChange, onSubmit, resultMode = false }: GuessMapProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const guessMarkerRef = useRef<google.maps.Marker | null>(null);
  const actualMarkerRef = useRef<google.maps.Marker | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const zonePolygonRef = useRef<google.maps.Polygon | null>(null);
  const [expanded, setExpanded] = useState(false);
  const zone = zones[zoneId];
  const showDebugPolygon = DEBUG_TOOLS_ENABLED;

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: zone.center,
      zoom: zone.defaultZoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
    });
    mapRef.current.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng || resultMode) return;
      onGuessChange(event.latLng.toJSON());
    });
  }, [onGuessChange, resultMode, zone.center, zone.defaultZoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(zone.center);
    mapRef.current.setZoom(zone.defaultZoom);

    zonePolygonRef.current?.setMap(null);
    zonePolygonRef.current = null;
    if (showDebugPolygon) {
      zonePolygonRef.current = new google.maps.Polygon({
        map: mapRef.current,
        paths: zone.polygon,
        clickable: false,
        strokeColor: "#39ff88",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#39ff88",
        fillOpacity: 0.08,
      });
      const polygonBounds = getBoundsForPolygon(zone.polygon);
      mapRef.current.fitBounds({
        north: polygonBounds.north,
        south: polygonBounds.south,
        east: polygonBounds.east,
        west: polygonBounds.west,
      });
    }
  }, [showDebugPolygon, zone.center, zone.defaultZoom, zone.polygon, zoneId]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (guessLocation) {
      guessMarkerRef.current ??= new google.maps.Marker({ map: mapRef.current, label: "G" });
      guessMarkerRef.current.setPosition(guessLocation);
    } else {
      guessMarkerRef.current?.setMap(null);
      guessMarkerRef.current = null;
    }
  }, [guessLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (actualLocation) {
      actualMarkerRef.current ??= new google.maps.Marker({ map: mapRef.current, label: "A" });
      actualMarkerRef.current.setPosition(actualLocation);
    } else {
      actualMarkerRef.current?.setMap(null);
      actualMarkerRef.current = null;
    }

    lineRef.current?.setMap(null);
    lineRef.current = null;
    if (actualLocation && guessLocation) {
      lineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path: [guessLocation, actualLocation],
        strokeColor: "#ff9f1c",
        strokeOpacity: 0.95,
        strokeWeight: 3,
      });
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(guessLocation);
      bounds.extend(actualLocation);
      mapRef.current.fitBounds(bounds, 48);
    }
  }, [actualLocation, guessLocation]);

  return (
    <div className={`guess-map guess-map-container ${expanded ? "guess-map-expanded" : ""}`}>
      <div ref={mapDivRef} className="guess-map-canvas" />
      {showDebugPolygon && (
        <div className="debug-boundary-label">
          {zone.boundaryAccuracy.toUpperCase()} boundary · {zone.boundarySource}
        </div>
      )}
      <div className="guess-map-controls">
        <RetroButton type="button" tone="map" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Collapse Map" : "Expand Map"}
        </RetroButton>
        {!resultMode && (
          <RetroButton type="button" tone="solid-orange" onClick={onSubmit} disabled={!guessLocation}>
            Submit Guess
          </RetroButton>
        )}
      </div>
    </div>
  );
}
