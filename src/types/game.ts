export type LatLngLiteral = google.maps.LatLngLiteral;

export type ZoneId = "empel" | "rosmalen" | "engelen" | "kerkdriel" | "mixed";
export type ConcreteZoneId = Exclude<ZoneId, "mixed">;
export type ModeId = "classic" | "no-move" | "speedrun";
export type GameStatus = "home" | "loading-round" | "playing" | "round-result" | "game-over";

export interface BoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GameZone {
  id: string;
  displayName: string;
  center: LatLngLiteral;
  bounds?: BoundsLiteral;
  polygon: LatLngLiteral[];
  defaultZoom: number;
  difficultyLabel: string;
  notes?: string;
  gameplayBoundaryDisclaimer?: string;
}

export interface GameMode {
  id: ModeId;
  displayName: string;
  rounds: number;
  allowMove: boolean;
  allowPan: boolean;
  allowZoom: boolean;
  timeLimitSeconds: number | null;
}

export interface RoundLocation {
  panoId: string;
  actualLocation: LatLngLiteral;
  initialPov: google.maps.StreetViewPov & { zoom: number };
}

export interface CurrentRound extends RoundLocation {
  roundNumber: number;
  zoneId: ConcreteZoneId;
  guessLocation?: LatLngLiteral;
  distanceMeters?: number;
  score?: number;
  rating?: string;
}

export interface RoundResult {
  roundNumber: number;
  zoneId: ConcreteZoneId;
  distanceMeters: number;
  score: number;
}

export interface GameState {
  status: GameStatus;
  selectedZoneId: ZoneId;
  selectedMode: ModeId;
  playerName: string;
  currentRoundIndex: number;
  totalRounds: number;
  totalScore: number;
  usedPanoIds: Set<string>;
  currentRound?: CurrentRound;
  roundResults: RoundResult[];
  errorMessage?: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  mode: ModeId;
  zone: ZoneId;
  rounds: number;
  dateIso: string;
  totalDistanceMeters: number;
  roundResults: RoundResult[];
}
