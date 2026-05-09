export type LatLngLiteral = { lat: number; lng: number };
export type MultiplayerStatus = "waiting" | "in-round" | "round-results" | "finished";

export type MultiplayerSettings = {
  zoneId: string;
  modeId: string;
  rounds: number;
  roundTimeLimitSeconds: number | null;
  viewTimeLimitSeconds: number | null;
  allowMove: boolean;
  allowPan: boolean;
  allowZoom: boolean;
  showRoundResultsAfterEveryoneGuessed: boolean;
};

export type PreparedRound = {
  zoneId: string;
  panoId: string;
  actualLocation: LatLngLiteral;
  initialPov: {
    heading: number;
    pitch: number;
    zoom: number;
  };
};

export type PlayerGuess = {
  playerId: string;
  roundId: string;
  guessLocation: LatLngLiteral;
  distanceMeters: number;
  score: number;
  submittedAt: number;
};

export type MultiplayerRound = PreparedRound & {
  id: string;
  roundNumber: number;
  startedAt: number | null;
  endsAt: number | null;
  guesses: PlayerGuess[];
};

export type PublicMultiplayerRound = Omit<MultiplayerRound, "actualLocation"> & {
  actualLocation?: LatLngLiteral;
};

export type MultiplayerPlayer = {
  id: string;
  socketId: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  joinedAt: number;
  lastSeenAt: number;
  disconnectedAt?: number;
  removedAt?: number;
  wasRemovedForInactivity?: boolean;
  totalScore: number;
  totalDistanceMeters: number;
  guesses: Record<string, PlayerGuess>;
};

export type PublicPlayer = Omit<MultiplayerPlayer, "socketId" | "guesses"> & {
  guessedCurrentRound: boolean;
};

export type MultiplayerLobbyState = {
  id: string;
  code: string;
  status: MultiplayerStatus;
  settings: MultiplayerSettings;
  players: PublicPlayer[];
  currentRoundIndex: number;
  currentRound?: PublicMultiplayerRound;
  rounds: PublicMultiplayerRound[];
  leaderboard: PublicPlayer[];
  createdAt: number;
};

export type RoundResultPayload = {
  round: PublicMultiplayerRound & { actualLocation: LatLngLiteral };
  playerResults: Array<PlayerGuess & { playerName: string }>;
  leaderboard: PublicPlayer[];
};
