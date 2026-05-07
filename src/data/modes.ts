import type { GameMode, ModeId } from "../types/game";

export const modes: Record<ModeId, GameMode> = {
  classic: {
    id: "classic",
    displayName: "Classic Local",
    rounds: 5,
    allowMove: true,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: null,
  },
  "no-move": {
    id: "no-move",
    displayName: "No Move Mode",
    rounds: 5,
    allowMove: false,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: null,
  },
  speedrun: {
    id: "speedrun",
    displayName: "Speedrun Mode",
    rounds: 5,
    allowMove: true,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: 60,
  },
};
