import { useEffect, useRef, useState } from "react";
import { modes } from "../data/modes";
import { zones } from "../data/zones";
import type { CurrentRound, LatLngLiteral, ModeId } from "../types/game";
import { DebugPanel } from "./DebugPanel";
import { GuessMap } from "./GuessMap";
import { RetroButton } from "./RetroButton";
import { sound } from "../lib/sound";
import { DEBUG_TOOLS_ENABLED } from "../lib/env";

interface GameScreenProps {
  round: CurrentRound;
  modeId: ModeId;
  viewSeconds: number;
  totalRounds: number;
  totalScore: number;
  onSubmitGuess: (guess: LatLngLiteral) => void;
  onResetView: () => void;
  onDebugGenerate: () => void;
}

export function GameScreen({ round, modeId, viewSeconds, totalRounds, totalScore, onSubmitGuess, onResetView, onDebugGenerate }: GameScreenProps) {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const [containerWarning, setContainerWarning] = useState<string | undefined>();
  const [guessLocation, setGuessLocation] = useState<LatLngLiteral | undefined>(round.guessLocation);
  const [secondsRemaining, setSecondsRemaining] = useState(viewSeconds);
  const [streetViewHidden, setStreetViewHidden] = useState(false);
  const mode = modes[modeId];
  const activeTimerSeconds = mode.hideStreetViewAfterTime ? viewSeconds : mode.timeLimitSeconds;

  useEffect(() => {
    const panoDiv = panoDivRef.current;
    if (!panoDiv) return;
    const options: google.maps.StreetViewPanoramaOptions = {
      pano: round.panoId,
      pov: round.initialPov,
      zoom: round.initialPov.zoom,
      visible: true,
      addressControl: false,
      showRoadLabels: false,
      linksControl: mode.allowMove,
      clickToGo: mode.allowMove,
      panControl: mode.allowPan,
      zoomControl: mode.allowZoom,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
    };

    if (!panoramaRef.current) {
      panoramaRef.current = new google.maps.StreetViewPanorama(panoDiv, options);
      attachStreetViewDebugListeners(panoramaRef.current, panoDiv, listenersRef.current, setContainerWarning);
    }

    panoramaRef.current.setOptions(options);
    panoramaRef.current.setPano(round.panoId);
    panoramaRef.current.setPov(round.initialPov);
    panoramaRef.current.setZoom(round.initialPov.zoom);
    panoramaRef.current.setVisible(true);
    google.maps.event.trigger(panoramaRef.current, "resize");
    checkStreetViewContainer(panoDiv, setContainerWarning);
    setGuessLocation(undefined);
    setStreetViewHidden(false);
    setSecondsRemaining(activeTimerSeconds ?? viewSeconds);

  }, [activeTimerSeconds, mode.allowMove, mode.allowPan, mode.allowZoom, round.initialPov, round.panoId, viewSeconds]);

  useEffect(() => {
    if (!activeTimerSeconds) return;
    setSecondsRemaining(activeTimerSeconds);
    setStreetViewHidden(false);
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        const next = Math.max(0, current - 1);
        if (next > 0 && next <= 5) sound.playTimerWarning();
        if (next === 0) {
          sound.playTimerTick();
          if (mode.hideStreetViewAfterTime) setStreetViewHidden(true);
          window.clearInterval(interval);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeTimerSeconds, mode.hideStreetViewAfterTime, round.panoId]);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
    };
  }, []);

  return (
    <main className="game-screen">
      <div ref={panoDivRef} className="street-view street-view-container" />
      {containerWarning && <div className="street-view-warning">{containerWarning}</div>}
      <div className="hud">
        <span>ROUND {round.roundNumber}/{totalRounds}</span>
        <span>{zones[round.zoneId].displayName}</span>
        <span>{mode.displayName}</span>
        {activeTimerSeconds && <span>{streetViewHidden ? "MEMORY MODE" : `${secondsRemaining}s`}</span>}
        <span>{totalScore} PTS</span>
      </div>
      {streetViewHidden && (
        <div className="memory-overlay">
          <div>
            <p className="eyebrow">Time's up</p>
            <h2>Make your guess from memory</h2>
          </div>
        </div>
      )}
      <div className="game-actions">
        <RetroButton type="button" tone="secondary" onClick={onResetView}>
          Reset View
        </RetroButton>
      </div>
      <GuessMap
        zoneId={round.zoneId}
        guessLocation={guessLocation}
        onGuessChange={(location) => {
          setGuessLocation(location);
          sound.playGuessPlaced();
        }}
        onSubmit={() => guessLocation && onSubmitGuess(guessLocation)}
      />
      {DEBUG_TOOLS_ENABLED && <DebugPanel round={round} onTestGenerate={onDebugGenerate} />}
    </main>
  );
}

function attachStreetViewDebugListeners(
  panorama: google.maps.StreetViewPanorama,
  container: HTMLDivElement,
  listeners: google.maps.MapsEventListener[],
  setContainerWarning: (warning: string | undefined) => void,
): void {
  const debug = DEBUG_TOOLS_ENABLED;
  const log = (eventName: string) => {
    checkStreetViewContainer(container, setContainerWarning);
    if (!debug) return;
    console.debug(`[StreetViewPanorama] ${eventName}`, {
      panoId: panorama.getPano(),
      position: panorama.getPosition()?.toJSON(),
      visible: panorama.getVisible(),
      status: panorama.getStatus(),
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    });
  };

  listeners.push(
    panorama.addListener("status_changed", () => log("status_changed")),
    panorama.addListener("pano_changed", () => log("pano_changed")),
    panorama.addListener("position_changed", () => log("position_changed")),
    panorama.addListener("visible_changed", () => log("visible_changed")),
  );

  window.setTimeout(() => log("post-load-health-check"), 2200);
}

function checkStreetViewContainer(container: HTMLDivElement, setContainerWarning: (warning: string | undefined) => void): void {
  const collapsed = container.clientWidth === 0 || container.clientHeight === 0;
  setContainerWarning(collapsed ? "Street View container collapsed - check CSS layout." : undefined);
}
