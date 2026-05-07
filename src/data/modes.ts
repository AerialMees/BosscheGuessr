import type { GameMode, ModeId } from "../types/game";

export const modes: Record<ModeId, GameMode> = {
  classic: {
    id: "classic",
    displayName: "Classic Local",
    description: "Five relaxed rounds. Move, pan, zoom, and soak in the local chaos.",
    rounds: 5,
    allowMove: true,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: null,
  },
  "no-move": {
    id: "no-move",
    displayName: "No Move Mode",
    description: "Movement limited. Pan and zoom, then trust your street-memory instincts.",
    rounds: 5,
    allowMove: false,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: null,
  },
  "timed-view": {
    id: "timed-view",
    displayName: "X-Second View",
    description: "Look quickly, then guess from memory. Movement limited during the view window.",
    rounds: 5,
    allowMove: false,
    allowPan: true,
    allowZoom: true,
    timeLimitSeconds: null,
    viewTimeLimitSeconds: 10,
    hideStreetViewAfterTime: true,
  },
};

export function clampTimedViewSeconds(seconds: number): number {
  return Math.min(60, Math.max(0.1, Math.round(seconds * 10) / 10));
}
