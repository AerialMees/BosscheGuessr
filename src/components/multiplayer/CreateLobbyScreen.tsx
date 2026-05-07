import { useState } from "react";
import { RetroButton } from "../RetroButton";

interface CreateLobbyScreenProps {
  onCreate: (playerName: string) => void;
  onBack: () => void;
  error?: string;
}

export function CreateLobbyScreen({ onCreate, onBack, error }: CreateLobbyScreenProps) {
  const [playerName, setPlayerName] = useState("HOST");
  const canCreate = playerName.trim().length > 0;

  return (
    <main className="screen centered">
      <section className="panel multiplayer-form">
        <p className="eyebrow">Host LAN lobby</p>
        <h1>Open the cabinet</h1>
        <p className="text-muted">Create a same-Wi-Fi lobby, then share the join link with friends.</p>
        {error && <p className="status-error">{error}</p>}
        <label>
          Host name
          <input value={playerName} maxLength={20} onChange={(event) => setPlayerName(event.target.value)} />
        </label>
        <div className="button-row">
          <RetroButton type="button" onClick={() => onCreate(playerName)} disabled={!canCreate}>
            Create Lobby
          </RetroButton>
          <RetroButton type="button" tone="secondary" onClick={onBack}>
            Back
          </RetroButton>
        </div>
      </section>
    </main>
  );
}
