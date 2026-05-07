import { useMemo, useState } from "react";
import { modes } from "../data/modes";
import { selectableZones } from "../data/zones";
import { getLeaderboard } from "../lib/leaderboard";
import type { GoogleMapsLoadError } from "../lib/googleMapsDiagnostics";
import type { ModeId, ZoneId } from "../types/game";
import { Leaderboard } from "./Leaderboard";
import { MapsErrorPanel } from "./MapsErrorPanel";
import { MapsSetupStatus } from "./MapsSetupStatus";
import { RetroButton } from "./RetroButton";

interface HomeScreenProps {
  onStart: (options: { playerName: string; zoneId: ZoneId; modeId: ModeId }) => void;
  mapsLoaded: boolean;
  mapsError?: GoogleMapsLoadError;
}

export function HomeScreen({ onStart, mapsLoaded, mapsError }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("PLAYER 1");
  const [zoneId, setZoneId] = useState<ZoneId>("empel");
  const [modeId, setModeId] = useState<ModeId>("classic");
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

        <MapsSetupStatus mapsLoaded={mapsLoaded} lastError={mapsError} />
        {mapsError && <MapsErrorPanel error={mapsError} />}

        <form
          className="panel setup-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (canStart) onStart({ playerName: playerName.trim(), zoneId, modeId });
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
          </label>
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
