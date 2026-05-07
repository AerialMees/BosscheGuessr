import { useEffect, useRef, useState } from "react";
import { zones } from "../data/zones";
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
  const [expanded, setExpanded] = useState(false);
  const zone = zones[zoneId];

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
  }, [zone.center, zone.defaultZoom, zoneId]);

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
    <div className={`guess-map ${expanded ? "guess-map-expanded" : ""}`}>
      <div ref={mapDivRef} className="guess-map-canvas" />
      <div className="guess-map-controls">
        <RetroButton type="button" tone="secondary" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Shrink" : "Expand"}
        </RetroButton>
        {!resultMode && (
          <RetroButton type="button" onClick={onSubmit} disabled={!guessLocation}>
            Submit Guess
          </RetroButton>
        )}
      </div>
    </div>
  );
}
