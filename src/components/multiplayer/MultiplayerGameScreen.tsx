import { useEffect, useRef, useState } from "react";
import { zones } from "../../data/zones";
import { explainGoogleMapsError } from "../../lib/googleMapsDiagnostics";
import { loadGoogleMaps } from "../../lib/googleMapsLoader";
import { sound } from "../../lib/sound";
import type { LatLngLiteral, MultiplayerLobbyState } from "../../shared/types";
import type { GoogleMapsLoadError } from "../../lib/googleMapsDiagnostics";
import type { ConcreteZoneId } from "../../types/game";
import { GuessMap } from "../GuessMap";
import { LoadingScreen } from "../LoadingScreen";
import { MapsErrorPanel } from "../MapsErrorPanel";

interface MultiplayerGameScreenProps {
  lobby: MultiplayerLobbyState;
  playerId?: string;
  onSubmitGuess: (roundId: string, guessLocation: LatLngLiteral) => void;
}

export function MultiplayerGameScreen({ lobby, playerId, onSubmitGuess }: MultiplayerGameScreenProps) {
  const round = lobby.currentRound;
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const lastWarningSecondRef = useRef<number | null>(null);
  const [guessLocation, setGuessLocation] = useState<LatLngLiteral>();
  const [now, setNow] = useState(Date.now());
  const [viewHidden, setViewHidden] = useState(false);
  const [mapsReady, setMapsReady] = useState(() => Boolean(window.google?.maps));
  const [mapsError, setMapsError] = useState<GoogleMapsLoadError | undefined>();
  const player = lobby.players.find((candidate) => candidate.id === playerId);
  const hasGuessed = Boolean(player?.guessedCurrentRound);
  const zoneId = round?.zoneId as ConcreteZoneId | undefined;
  const zone = zoneId ? zones[zoneId] : undefined;
  const roundRemaining = round?.endsAt ? Math.max(0, Math.ceil((round.endsAt - now) / 1000)) : null;
  const viewRemaining = lobby.settings.viewTimeLimitSeconds && round?.startedAt ? Math.max(0, (round.startedAt + lobby.settings.viewTimeLimitSeconds * 1000 - now) / 1000) : null;
  const activePlayers = lobby.players.filter((candidate) => !candidate.removedAt);
  const disconnectedPlayers = lobby.players.filter((candidate) => !candidate.connected && !candidate.removedAt);
  const removedPlayers = lobby.players.filter((candidate) => candidate.removedAt);

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
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!round || !mapsReady || !panoDivRef.current) return;
    const options: google.maps.StreetViewPanoramaOptions = {
      pano: round.panoId,
      pov: round.initialPov,
      zoom: round.initialPov.zoom,
      visible: true,
      addressControl: false,
      showRoadLabels: false,
      linksControl: lobby.settings.allowMove,
      clickToGo: lobby.settings.allowMove,
      panControl: lobby.settings.allowPan,
      zoomControl: lobby.settings.allowZoom,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
    };
    panoramaRef.current ??= new google.maps.StreetViewPanorama(panoDivRef.current, options);
    panoramaRef.current.setOptions(options);
    panoramaRef.current.setPano(round.panoId);
    panoramaRef.current.setPov(round.initialPov);
    panoramaRef.current.setVisible(true);
    setGuessLocation(undefined);
    setViewHidden(false);
    lastWarningSecondRef.current = null;
  }, [lobby.settings.allowMove, lobby.settings.allowPan, lobby.settings.allowZoom, mapsReady, round?.id]);

  useEffect(() => {
    if (viewRemaining !== null && viewRemaining <= 0) setViewHidden(true);
  }, [viewRemaining]);

  useEffect(() => {
    if (viewRemaining === null || viewRemaining <= 0 || viewRemaining > 5) return;
    const currentSecond = Math.ceil(viewRemaining);
    if (lastWarningSecondRef.current === currentSecond) return;
    lastWarningSecondRef.current = currentSecond;
    sound.playTimerWarning(currentSecond);
  }, [viewRemaining]);

  if (mapsError) {
    return (
      <main className="screen centered">
        <MapsErrorPanel error={mapsError} />
      </main>
    );
  }

  if (!mapsReady) {
    return <LoadingScreen message="Connecting Street View to the LAN arena..." />;
  }

  if (!round || !zone || !zoneId) return null;

  return (
    <main className="game-screen">
      <div ref={panoDivRef} className="street-view street-view-container" />
      <div className="hud">
        <span>ROUND {round.roundNumber}/{lobby.settings.rounds}</span>
        <span>{zone.displayName}</span>
        <span>{lobby.settings.modeId}</span>
        {roundRemaining !== null && <span>{roundRemaining}s</span>}
        {hasGuessed && <span>GUESS LOCKED</span>}
        <span>{activePlayers.length} PLAYERS</span>
      </div>
      {viewHidden && (
        <div className="memory-overlay">
          <div>
            <p className="eyebrow">Memory mode</p>
            <h2>Street View hidden</h2>
          </div>
        </div>
      )}
      {disconnectedPlayers.length > 0 && (
        <div className="multiplayer-toast">
          {disconnectedPlayers.length === 1
            ? `${disconnectedPlayers[0].name} disconnected — waiting up to 120s`
            : `${disconnectedPlayers.length} players disconnected — waiting up to 120s`}
        </div>
      )}
      {disconnectedPlayers.length === 0 && removedPlayers.length > 0 && (
        <div className="multiplayer-toast">{removedPlayers.at(-1)?.name ?? "Player"} removed due to inactivity</div>
      )}
      <GuessMap
        zoneId={zoneId}
        guessLocation={guessLocation}
        onGuessChange={(location) => {
          setGuessLocation(location);
          sound.playGuessPlaced();
        }}
        onSubmit={() => {
          if (guessLocation && !hasGuessed) onSubmitGuess(round.id, guessLocation);
        }}
      />
      <aside className="multiplayer-status panel active-round-status">
        <h3>Players</h3>
        {lobby.players.map((candidate) => (
          <p key={candidate.id}>
            {candidate.removedAt ? "×" : candidate.connected ? (candidate.guessedCurrentRound ? "✓" : "○") : "!"} {candidate.name}
            {candidate.removedAt ? <small> removed</small> : !candidate.connected && <small> disconnected</small>}
          </p>
        ))}
      </aside>
    </main>
  );
}
