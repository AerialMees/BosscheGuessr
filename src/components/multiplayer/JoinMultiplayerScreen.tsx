import { useState } from "react";
import { RetroButton } from "../RetroButton";

interface JoinMultiplayerScreenProps {
  initialCode?: string;
  onJoin: (playerName: string, code: string) => void;
  onBack: () => void;
  error?: string;
}

export function JoinMultiplayerScreen({ initialCode = "", onJoin, onBack, error }: JoinMultiplayerScreenProps) {
  const [playerName, setPlayerName] = useState("PLAYER 1");
  const [code, setCode] = useState(initialCode.toUpperCase());

  return (
    <main className="screen centered">
      <section className="panel multiplayer-form">
        <p className="eyebrow">Join LAN lobby</p>
        <h1>Enter the arena</h1>
        {error && <p className="status-error">{error}</p>}
        <label>
          Player name
          <input value={playerName} maxLength={20} onChange={(event) => setPlayerName(event.target.value)} />
        </label>
        <label>
          Lobby code
          <input value={code} maxLength={8} onChange={(event) => setCode(event.target.value.toUpperCase())} />
        </label>
        <div className="button-row">
          <RetroButton type="button" onClick={() => onJoin(playerName, code)} disabled={!code.trim()}>
            Join
          </RetroButton>
          <RetroButton type="button" tone="secondary" onClick={onBack}>
            Back
          </RetroButton>
        </div>
      </section>
    </main>
  );
}
