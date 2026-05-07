import { useMemo, useState } from "react";
import { clampTimedViewSeconds, modes } from "../data/modes";
import { selectableZones } from "../data/zones";
import { getLeaderboard } from "../lib/leaderboard";
import type { GoogleMapsLoadError } from "../lib/googleMapsDiagnostics";
import type { ModeId, ZoneId } from "../types/game";
import { DEBUG_TOOLS_ENABLED } from "../lib/env";
import { sound } from "../lib/sound";
import { Leaderboard } from "./Leaderboard";
import { MapsErrorPanel } from "./MapsErrorPanel";
import { MapsSetupStatus } from "./MapsSetupStatus";
import { RetroButton } from "./RetroButton";

interface HomeScreenProps {
  onStart: (options: { playerName: string; zoneId: ZoneId; modeId: ModeId; viewSeconds: number }) => void;
  mapsLoaded: boolean;
  mapsError?: GoogleMapsLoadError;
}

export function HomeScreen({ onStart, mapsLoaded, mapsError }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("PLAYER 1");
  const [zoneId, setZoneId] = useState<ZoneId>("empel");
  const [modeId, setModeId] = useState<ModeId>("classic");
  const [viewSeconds, setViewSeconds] = useState(10);
  const leaderboard = useMemo(() => getLeaderboard(), []);
  const canStart = playerName.trim().length > 0;

  return (
    <main className="screen home-screen">
      <section className="home-main">
        <div className="title-block">
          <p className="eyebrow">Private local Street View challenge</p>
          <h1>BOSSCHE GUESSR</h1>
          <p>Local Street View chaos around Den Bosch.</p>
        </div>

        {(mapsError || DEBUG_TOOLS_ENABLED) && <MapsSetupStatus mapsLoaded={mapsLoaded} lastError={mapsError} />}
        {mapsError && <MapsErrorPanel error={mapsError} />}

        <form
          className="panel setup-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (canStart) {
              void sound.unlock();
              sound.playStartGame();
              onStart({ playerName: playerName.trim(), zoneId, modeId, viewSeconds });
            }
          }}
        >
          <label>
            Player name
            <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={20} />
          </label>
          <label>
            Town
            <select value={zoneId} onChange={(event) => setZoneId(event.target.value as ZoneId)}>
              {selectableZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mode
            <select value={modeId} onChange={(event) => setModeId(event.target.value as ModeId)}>
              {Object.values(modes).map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.displayName}
                </option>
              ))}
            </select>
            <small>{modes[modeId].description}</small>
          </label>
          {modeId === "timed-view" && (
            <label>
              View time: {viewSeconds} seconds
              <input
                type="range"
                min={0.1}
                max={60}
                step={0.1}
                value={viewSeconds}
                onChange={(event) => setViewSeconds(clampTimedViewSeconds(Number(event.target.value)))}
              />
            </label>
          )}
          <RetroButton type="submit" disabled={!canStart}>
            Start Game
          </RetroButton>
        </form>
      </section>
      <aside className="panel home-leaderboard">
        <Leaderboard entries={leaderboard} compact />
      </aside>
    </main>
  );
}
