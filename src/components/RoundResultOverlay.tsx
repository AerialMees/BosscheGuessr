import { zones } from "../data/zones";
import { formatDistance } from "../lib/geo";
import { resultFlavor } from "../lib/scoring";
import type { CurrentRound } from "../types/game";
import { RetroButton } from "./RetroButton";

interface RoundResultOverlayProps {
  round: CurrentRound;
  isFinalRound: boolean;
  onNext: () => void;
}

export function RoundResultOverlay({ round, isFinalRound, onNext }: RoundResultOverlayProps) {
  const zoneName = zones[round.zoneId].displayName;
  const distance = round.distanceMeters ?? 0;
  return (
    <div className="result-overlay">
      <div className="panel result-panel">
        <p className="eyebrow">Round {round.roundNumber} result</p>
        <h2>{round.rating}</h2>
        <p className="big-score">+{round.score} pts</p>
        <p>{formatDistance(distance)} from the actual spot.</p>
        <p>{resultFlavor(distance, zoneName)}</p>
        <RetroButton type="button" onClick={onNext}>
          {isFinalRound ? "Final Scores" : "Next Round"}
        </RetroButton>
      </div>
    </div>
  );
}
