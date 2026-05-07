import { modes } from "../data/modes";
import { selectableZones, zones } from "../data/zones";
import { formatDistance } from "../lib/geo";
import type { LeaderboardEntry } from "../types/game";
import { Leaderboard } from "./Leaderboard";
import { RetroButton } from "./RetroButton";

interface FinalResultsProps {
  entry: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
  onPlayAgain: () => void;
  onLeaderboardChanged: () => void;
}

export function FinalResults({ entry, leaderboard, onPlayAgain, onLeaderboardChanged }: FinalResultsProps) {
  const zoneName = selectableZones.find((zone) => zone.id === entry.zone)?.displayName ?? entry.zone;
  return (
    <main className="screen final-screen">
      <section className="panel final-score">
        <p className="eyebrow">Game over</p>
        <h1>{entry.totalScore} / {entry.maxPossibleScore}</h1>
        <p>{entry.percentage}% in {formatModeLabel(entry.mode, entry.viewSeconds)} · {zoneName}</p>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Town</th>
              <th>Distance</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {entry.roundResults.map((round) => (
              <tr key={round.roundNumber}>
                <td>{round.roundNumber}</td>
                <td>{zones[round.zoneId].displayName}</td>
                <td>{formatDistance(round.distanceMeters)}</td>
                <td>{round.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <RetroButton type="button" onClick={onPlayAgain}>
          Play Again
        </RetroButton>
      </section>
      <section className="panel final-leaderboard">
        <Leaderboard entries={leaderboard} onClear={onLeaderboardChanged} />
      </section>
    </main>
  );
}

function formatModeLabel(mode: keyof typeof modes, viewSeconds?: number): string {
  if (mode === "timed-view") return `X-Second View · ${viewSeconds ?? 10}s`;
  return modes[mode].displayName;
}
