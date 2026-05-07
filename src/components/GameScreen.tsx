import { useEffect, useRef, useState } from "react";
import { modes } from "../data/modes";
import { zones } from "../data/zones";
import type { CurrentRound, LatLngLiteral, ModeId } from "../types/game";
import { DebugPanel } from "./DebugPanel";
import { GuessMap } from "./GuessMap";
import { RetroButton } from "./RetroButton";

interface GameScreenProps {
  round: CurrentRound;
  modeId: ModeId;
  totalRounds: number;
  totalScore: number;
  onSubmitGuess: (guess: LatLngLiteral) => void;
  onResetView: () => void;
  onDebugGenerate: () => void;
}

export function GameScreen({ round, modeId, totalRounds, totalScore, onSubmitGuess, onResetView, onDebugGenerate }: GameScreenProps) {
  const panoDivRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [guessLocation, setGuessLocation] = useState<LatLngLiteral | undefined>(round.guessLocation);
  const mode = modes[modeId];

  useEffect(() => {
    if (!panoDivRef.current) return;
    const options: google.maps.StreetViewPanoramaOptions = {
      pano: round.panoId,
      pov: round.initialPov,
      zoom: round.initialPov.zoom,
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
      panoramaRef.current = new google.maps.StreetViewPanorama(panoDivRef.current, options);
    } else {
      panoramaRef.current.setOptions(options);
      panoramaRef.current.setPano(round.panoId);
      panoramaRef.current.setPov(round.initialPov);
      panoramaRef.current.setZoom(round.initialPov.zoom);
    }
    setGuessLocation(undefined);
  }, [mode.allowMove, mode.allowPan, mode.allowZoom, round.initialPov, round.panoId]);

  return (
    <main className="game-screen">
      <div ref={panoDivRef} className="street-view" />
      <div className="hud">
        <span>ROUND {round.roundNumber}/{totalRounds}</span>
        <span>{zones[round.zoneId].displayName}</span>
        <span>{totalScore} PTS</span>
      </div>
      <div className="game-actions">
        <RetroButton type="button" tone="secondary" onClick={onResetView}>
          Reset View
        </RetroButton>
      </div>
      <GuessMap
        zoneId={round.zoneId}
        guessLocation={guessLocation}
        onGuessChange={setGuessLocation}
        onSubmit={() => guessLocation && onSubmitGuess(guessLocation)}
      />
      <DebugPanel round={round} onTestGenerate={onDebugGenerate} />
    </main>
  );
}
