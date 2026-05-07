import type { MultiplayerLobbyState, MultiplayerPlayer, MultiplayerRound, MultiplayerSettings, RoundResultPayload } from "../src/shared/types";

export type Lobby = Omit<MultiplayerLobbyState, "players" | "rounds" | "currentRound" | "leaderboard"> & {
  hostSocketId: string;
  players: MultiplayerPlayer[];
  rounds: MultiplayerRound[];
  roundTimer?: NodeJS.Timeout;
};

export type ServerToClientEvents = {
  "lobby:state": (state: MultiplayerLobbyState) => void;
  "lobby:error": (message: string) => void;
  "round:results": (payload: RoundResultPayload) => void;
};

export type ClientToServerEvents = {
  "lobby:create": (payload: { playerName: string }, callback?: (response: { ok: boolean; state?: MultiplayerLobbyState; playerId?: string; error?: string }) => void) => void;
  "lobby:join": (payload: { code: string; playerName: string }, callback?: (response: { ok: boolean; state?: MultiplayerLobbyState; playerId?: string; error?: string }) => void) => void;
  "lobby:update-settings": (payload: { code: string; settingsPatch: Partial<MultiplayerSettings> }) => void;
  "game:start": (payload: { code: string; preparedRounds: unknown[] }) => void;
  "round:submit-guess": (payload: { code: string; roundId: string; guessLocation: { lat: number; lng: number } }) => void;
  "round:next": (payload: { code: string }) => void;
  "lobby:leave": (payload: { code: string }) => void;
};
