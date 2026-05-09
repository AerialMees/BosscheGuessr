import { useEffect, useRef, useState } from "react";
import { zones } from "../../data/zones";
import { formatDistance } from "../../lib/geo";
import { explainGoogleMapsError } from "../../lib/googleMapsDiagnostics";
import { loadGoogleMaps } from "../../lib/googleMapsLoader";
import type { LatLngLiteral, MultiplayerLobbyState, RoundResultPayload } from "../../shared/types";
import type { GoogleMapsLoadError } from "../../lib/googleMapsDiagnostics";
import type { ConcreteZoneId } from "../../types/game";
import { MapsErrorPanel } from "../MapsErrorPanel";
import { RetroButton } from "../RetroButton";

interface MultiplayerResultsScreenProps {
  lobby: MultiplayerLobbyState;
  results?: RoundResultPayload;
  playerId?: string;
  onNextRound: () => void;
  onLeave: () => void;
}

export function MultiplayerResultsScreen({ lobby, results, playerId, onNextRound, onLeave }: MultiplayerResultsScreenProps) {
  const isHost = lobby.players.find((player) => player.id === playerId)?.isHost;
  const isFinal = lobby.status === "finished";

  return (
    <main className="screen multiplayer-results-screen">
      <section className="panel">
        <p className="eyebrow">{isFinal ? "Final board" : "Round results"}</p>
        <h1>{isFinal ? "Competition Complete" : `Round ${results?.round.roundNumber ?? lobby.currentRoundIndex + 1}`}</h1>
        {results && <MultiplayerResultMap results={results} />}
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Distance</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {lobby.players.map((player) => {
              const result = results?.playerResults.find((candidate) => candidate.playerId === player.id);
              return (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{result ? formatDistance(result.distanceMeters) : player.removedAt ? "Removed" : "No guess"}</td>
                  <td>{result?.score ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="button-row">
          {isHost && !isFinal && <RetroButton type="button" onClick={onNextRound}>Next Round</RetroButton>}
          {isFinal && (
            <RetroButton type="button" onClick={onLeave}>
              Back to Menu
            </RetroButton>
          )}
        </div>
      </section>
      <section className="panel">
        <h2>Leaderboard</h2>
        <table>
          <tbody>
            {lobby.leaderboard.map((player, index) => (
              <tr key={player.id}>
                <td>#{index + 1}</td>
                <td>{player.name}</td>
                <td>{player.totalScore}</td>
                <td>{formatDistance(player.totalDistanceMeters)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function MultiplayerResultMap({ results }: { results: RoundResultPayload }) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Array<google.maps.Marker | google.maps.Polyline>>([]);
  const [mapsReady, setMapsReady] = useState(() => Boolean(window.google?.maps));
  const [mapsError, setMapsError] = useState<GoogleMapsLoadError | undefined>();
  const zone = zones[results.round.zoneId as ConcreteZoneId];

  useEffect(() => {
    let active = true;
    void loadGoogleMaps()
      .then(() => {
        if (!active) return;
        setMapsReady(true);
        setMapsError(undefined);
      })
      .catch((error) => {
        if (!active) return;
        setMapsError(explainGoogleMapsError(error));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapDivRef.current) return;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: zone.center,
      zoom: zone.defaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    const bounds = new google.maps.LatLngBounds();
    const actual = results.round.actualLocation as LatLngLiteral;
    overlaysRef.current.push(new google.maps.Marker({ map: mapRef.current, position: actual, label: "A" }));
    bounds.extend(actual);
    results.playerResults.forEach((result, index) => {
      overlaysRef.current.push(new google.maps.Marker({ map: mapRef.current, position: result.guessLocation, label: String(index + 1) }));
      overlaysRef.current.push(new google.maps.Polyline({
        map: mapRef.current,
        path: [result.guessLocation, actual],
        strokeColor: ["#00d9ff", "#ff2bd6", "#ff8a00", "#39ffb6"][index % 4],
        strokeOpacity: 0.9,
        strokeWeight: 3,
      }));
      bounds.extend(result.guessLocation);
    });
    mapRef.current.fitBounds(bounds, 48);
  }, [mapsReady, results, zone.center, zone.defaultZoom]);

  useEffect(() => {
    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
      if (mapDivRef.current) mapDivRef.current.replaceChildren();
    };
  }, []);

  if (mapsError) return <MapsErrorPanel error={mapsError} />;
  if (!mapsReady) return <div className="multiplayer-result-map guess-map-container centered">Loading result map...</div>;

  return <div ref={mapDivRef} className="multiplayer-result-map guess-map-container" />;
}
