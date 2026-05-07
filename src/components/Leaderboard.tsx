import { useMemo, useState } from "react";
import { modes } from "../data/modes";
import { selectableZones, zones } from "../data/zones";
import { clearLeaderboard, getLeaderboard } from "../lib/leaderboard";
import type { LeaderboardEntry, ModeId, ZoneId } from "../types/game";
import { RetroButton } from "./RetroButton";

interface LeaderboardProps {
  entries?: LeaderboardEntry[];
  compact?: boolean;
  onClear?: () => void;
}

export function Leaderboard({ entries, compact = false, onClear }: LeaderboardProps) {
  const [modeFilter, setModeFilter] = useState<ModeId | "all">("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneId | "all">("all");
  const sourceEntries = entries ?? getLeaderboard();

  const filtered = useMemo(
    () =>
      sourceEntries
        .filter((entry) => modeFilter === "all" || entry.mode === modeFilter)
        .filter((entry) => zoneFilter === "all" || entry.zone === zoneFilter)
        .slice(0, compact ? 5 : 10),
    [compact, modeFilter, sourceEntries, zoneFilter],
  );

  function handleClear() {
    if (confirm("Clear local leaderboard?")) {
      clearLeaderboard();
      onClear?.();
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(sourceEntries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "boschguessr-leaderboard.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="leaderboard">
      <div className="leaderboard-head">
        <h2>HIGH SCORES</h2>
        <span className="insert-coin blink">INSERT COIN</span>
      </div>

      {!compact && (
        <div className="filters">
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value as ZoneId | "all")}>
            <option value="all">All towns</option>
            {selectableZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.displayName}
              </option>
            ))}
          </select>
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ModeId | "all")}>
            <option value="all">All modes</option>
            {Object.values(modes).map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Mode</th>
            <th>Town</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry, index) => (
            <tr key={entry.id}>
              <td>{index + 1}</td>
              <td>{entry.playerName}</td>
              <td>{entry.totalScore}</td>
              <td>{formatModeLabel(entry.mode, entry.viewSeconds)}</td>
              <td>{entry.zone === "mixed" ? "Mixed" : zones[entry.zone].displayName}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5}>No local scores yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {!compact && (
        <div className="button-row">
          <RetroButton type="button" tone="secondary" onClick={exportJson} disabled={sourceEntries.length === 0}>
            Export JSON
          </RetroButton>
          <RetroButton type="button" tone="danger" onClick={handleClear} disabled={sourceEntries.length === 0}>
            Clear
          </RetroButton>
        </div>
      )}
    </section>
  );
}

function formatModeLabel(mode: ModeId, viewSeconds?: number): string {
  if (mode === "timed-view") return `X-Second View · ${viewSeconds ?? 10}s`;
  if (mode === "bike-paths") return "Bike Paths";
  return modes[mode].displayName;
}
