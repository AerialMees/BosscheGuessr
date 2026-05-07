import type { CurrentRound } from "../types/game";
import { RetroButton } from "./RetroButton";

interface DebugPanelProps {
  round?: CurrentRound;
  onTestGenerate: () => void;
}

export function DebugPanel({ round, onTestGenerate }: DebugPanelProps) {
  if (import.meta.env.VITE_ENABLE_DEBUG_TOOLS !== "true") return null;

  return (
    <aside className="debug-panel">
      <strong>DEBUG</strong>
      <span>pano: {round?.panoId ?? "none"}</span>
      <span>zone: {round?.zoneId ?? "none"}</span>
      <span>
        actual: {round ? `${round.actualLocation.lat.toFixed(6)}, ${round.actualLocation.lng.toFixed(6)}` : "none"}
      </span>
      <RetroButton
        type="button"
        tone="secondary"
        onClick={() => round && navigator.clipboard.writeText(JSON.stringify(round, null, 2))}
        disabled={!round}
      >
        Copy round JSON
      </RetroButton>
      <RetroButton type="button" tone="secondary" onClick={onTestGenerate}>
        Test generate 10
      </RetroButton>
    </aside>
  );
}
