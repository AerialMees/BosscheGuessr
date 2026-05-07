import { RetroButton } from "./RetroButton";

interface ModeSelectScreenProps {
  onSinglePlayer: () => void;
  onHost: () => void;
  onJoin: () => void;
}

export function ModeSelectScreen({ onSinglePlayer, onHost, onJoin }: ModeSelectScreenProps) {
  return (
    <main className="screen mode-select-screen">
      <section className="title-block">
        <p className="eyebrow">Local arcade chaos</p>
        <h1>BOSSCHE GUESSR</h1>
        <p>Solo runs or same-Wi-Fi party competitions around Den Bosch.</p>
      </section>
      <section className="mode-card-grid">
        <article className="panel mode-card">
          <h2>Single Player</h2>
          <p>Classic local guessing, high scores, and weirdly specific street memory.</p>
          <RetroButton type="button" onClick={onSinglePlayer}>Play Solo</RetroButton>
        </article>
        <article className="panel mode-card">
          <h2>Host Multiplayer</h2>
          <p>Create a LAN lobby, tune the rounds, and invite friends on the same Wi-Fi.</p>
          <RetroButton type="button" onClick={onHost}>Host Lobby</RetroButton>
        </article>
        <article className="panel mode-card">
          <h2>Join Multiplayer</h2>
          <p>Enter a lobby code or open a shared join link from the host.</p>
          <RetroButton type="button" onClick={onJoin}>Join Lobby</RetroButton>
        </article>
      </section>
    </main>
  );
}
