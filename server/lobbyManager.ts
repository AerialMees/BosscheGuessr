import { randomBytes } from "node:crypto";
import { distanceMeters } from "../src/shared/geo";
import { calculateScore, scoringScaleForZone } from "../src/shared/scoring";
import type { LatLngLiteral, MultiplayerLobbyState, MultiplayerSettings, PreparedRound, PublicPlayer, RoundResultPayload } from "../src/shared/types";
import type { Lobby } from "./types";

const DEFAULT_SETTINGS: MultiplayerSettings = {
  zoneId: "den-bosch",
  modeId: "classic",
  rounds: 5,
  roundTimeLimitSeconds: null,
  viewTimeLimitSeconds: null,
  allowMove: true,
  allowPan: true,
  allowZoom: true,
  showRoundResultsAfterEveryoneGuessed: true,
};

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();
  private readonly onRoundExpired?: (code: string) => void;

  constructor(onRoundExpired?: (code: string) => void) {
    this.onRoundExpired = onRoundExpired;
  }

  createLobby(socketId: string, playerName: string): { state: MultiplayerLobbyState; playerId: string } {
    const code = this.createCode();
    const playerId = randomId(10);
    const lobby: Lobby = {
      id: randomId(12),
      code,
      hostSocketId: socketId,
      status: "waiting",
      settings: { ...DEFAULT_SETTINGS },
      players: [this.createPlayer(playerId, socketId, playerName, true)],
      currentRoundIndex: 0,
      rounds: [],
      createdAt: Date.now(),
    };
    this.lobbies.set(code, lobby);
    return { state: this.toPublicState(lobby), playerId };
  }

  joinLobby(codeInput: string, socketId: string, playerName: string): { state: MultiplayerLobbyState; playerId: string } {
    const lobby = this.requireLobby(codeInput);
    const existing = lobby.players.find((player) => player.name.toLowerCase() === sanitizePlayerName(playerName).toLowerCase() && !player.connected);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      existing.isHost = lobby.hostSocketId === socketId;
      return { state: this.toPublicState(lobby), playerId: existing.id };
    }

    const playerId = randomId(10);
    lobby.players.push(this.createPlayer(playerId, socketId, playerName, false));
    return { state: this.toPublicState(lobby), playerId };
  }

  updateSettings(code: string, socketId: string, patch: Partial<MultiplayerSettings>): MultiplayerLobbyState {
    const lobby = this.requireHostLobby(code, socketId);
    if (lobby.status !== "waiting") throw new Error("Settings can only be changed before the game starts.");
    lobby.settings = sanitizeSettings({ ...lobby.settings, ...patch });
    return this.toPublicState(lobby);
  }

  startGame(code: string, socketId: string, preparedRoundsInput: unknown[]): MultiplayerLobbyState {
    const lobby = this.requireHostLobby(code, socketId);
    const preparedRounds = Array.isArray(preparedRoundsInput) ? preparedRoundsInput.map(validatePreparedRound).slice(0, lobby.settings.rounds) : [];
    if (preparedRounds.length < lobby.settings.rounds) throw new Error("Not enough prepared rounds.");
    lobby.rounds = preparedRounds.map((round, index) => ({
      ...round,
        id: randomId(12),
      roundNumber: index + 1,
      startedAt: null,
      endsAt: null,
      guesses: [],
    }));
    lobby.currentRoundIndex = 0;
    lobby.players.forEach((player) => {
      player.totalScore = 0;
      player.totalDistanceMeters = 0;
      player.guesses = {};
    });
    this.startCurrentRound(lobby);
    return this.toPublicState(lobby);
  }

  submitGuess(code: string, socketId: string, roundId: string, guessLocation: LatLngLiteral): { state: MultiplayerLobbyState; results?: RoundResultPayload } {
    const lobby = this.requireLobby(code);
    if (lobby.status !== "in-round") throw new Error("This round is not accepting guesses.");
    const player = lobby.players.find((candidate) => candidate.socketId === socketId && candidate.connected);
    const round = lobby.rounds[lobby.currentRoundIndex];
    if (!player || !round || round.id !== roundId) throw new Error("Invalid round guess.");
    if (player.guesses[roundId]) return { state: this.toPublicState(lobby) };

    const distance = distanceMeters(guessLocation, round.actualLocation);
    const submittedAt = Date.now();
    const score = calculateScore(distance, scoringScaleForZone(round.zoneId, lobby.settings.zoneId), timeRemainingForScore(round, lobby.settings, submittedAt));
    const guess = { playerId: player.id, roundId, guessLocation, distanceMeters: distance, score, submittedAt };
    player.guesses[roundId] = guess;
    player.totalScore += score;
    player.totalDistanceMeters += distance;
    round.guesses.push(guess);

    if (this.everyoneConnectedGuessed(lobby, round.id) && lobby.settings.showRoundResultsAfterEveryoneGuessed) {
      return { state: this.finishRound(lobby), results: this.roundResults(lobby) };
    }
    return { state: this.toPublicState(lobby) };
  }

  nextRound(code: string, socketId: string): MultiplayerLobbyState {
    const lobby = this.requireHostLobby(code, socketId);
    if (lobby.status !== "round-results") throw new Error("Round results are not ready.");
    if (lobby.currentRoundIndex >= lobby.rounds.length - 1) {
      lobby.status = "finished";
      return this.toPublicState(lobby, true);
    }
    lobby.currentRoundIndex += 1;
    this.startCurrentRound(lobby);
    return this.toPublicState(lobby);
  }

  leave(socketId: string): MultiplayerLobbyState[] {
    const changed: MultiplayerLobbyState[] = [];
    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((candidate) => candidate.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      if (lobby.hostSocketId === socketId) {
        const nextHost = lobby.players.find((candidate) => candidate.connected);
        if (nextHost) {
          lobby.hostSocketId = nextHost.socketId;
          lobby.players.forEach((candidate) => {
            candidate.isHost = candidate.id === nextHost.id;
          });
        }
      }
      changed.push(this.toPublicState(lobby, lobby.status !== "in-round"));
    }
    return changed;
  }

  getLobby(code: string): Lobby | undefined {
    return this.lobbies.get(normalizeCode(code));
  }

  getPublicState(code: string, revealActual = false): MultiplayerLobbyState | null {
    const lobby = this.getLobby(code);
    return lobby ? this.toPublicState(lobby, revealActual) : null;
  }

  finishRoundByTimer(code: string): MultiplayerLobbyState | null {
    const lobby = this.getLobby(code);
    if (!lobby || lobby.status !== "in-round") return null;
    return this.finishRound(lobby);
  }

  roundResultsFor(code: string): RoundResultPayload | null {
    const lobby = this.getLobby(code);
    if (!lobby || (lobby.status !== "round-results" && lobby.status !== "finished")) return null;
    return this.roundResults(lobby);
  }

  cleanupOldLobbies(maxAgeMs = 6 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [code, lobby] of this.lobbies) {
      if (now - lobby.createdAt > maxAgeMs) {
        if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
        this.lobbies.delete(code);
      }
    }
  }

  private startCurrentRound(lobby: Lobby): void {
    if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
    const round = lobby.rounds[lobby.currentRoundIndex];
    const startedAt = Date.now();
    round.startedAt = startedAt;
    round.endsAt = lobby.settings.roundTimeLimitSeconds ? startedAt + lobby.settings.roundTimeLimitSeconds * 1000 : null;
    lobby.status = "in-round";
    if (round.endsAt) {
      lobby.roundTimer = setTimeout(() => {
        this.finishRound(lobby);
        this.onRoundExpired?.(lobby.code);
      }, Math.max(0, round.endsAt - Date.now()));
    }
  }

  private finishRound(lobby: Lobby): MultiplayerLobbyState {
    if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
    lobby.status = lobby.currentRoundIndex >= lobby.rounds.length - 1 ? "finished" : "round-results";
    return this.toPublicState(lobby, true);
  }

  private roundResults(lobby: Lobby): RoundResultPayload {
    const round = lobby.rounds[lobby.currentRoundIndex];
    return {
      round: { ...round, actualLocation: round.actualLocation },
      playerResults: round.guesses
        .map((guess) => ({ ...guess, playerName: lobby.players.find((player) => player.id === guess.playerId)?.name ?? "Player" }))
        .sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters),
      leaderboard: this.publicLeaderboard(lobby),
    };
  }

  private everyoneConnectedGuessed(lobby: Lobby, roundId: string): boolean {
    const connectedPlayers = lobby.players.filter((player) => player.connected);
    return connectedPlayers.length > 0 && connectedPlayers.every((player) => Boolean(player.guesses[roundId]));
  }

  private toPublicState(lobby: Lobby, revealActual = false): MultiplayerLobbyState {
    const currentRound = lobby.rounds[lobby.currentRoundIndex];
    const visibleRoundCount = lobby.status === "finished" ? lobby.rounds.length : Math.min(lobby.rounds.length, lobby.currentRoundIndex + 1);
    return {
      id: lobby.id,
      code: lobby.code,
      status: lobby.status,
      settings: lobby.settings,
      players: lobby.players.map((player) => this.publicPlayer(player, currentRound?.id)),
      currentRoundIndex: lobby.currentRoundIndex,
      currentRound: currentRound ? publicRound(currentRound, revealActual || lobby.status !== "in-round") : undefined,
      rounds: lobby.rounds.slice(0, visibleRoundCount).map((round, index) => publicRound(round, (revealActual || lobby.status !== "in-round") && index <= lobby.currentRoundIndex)),
      leaderboard: this.publicLeaderboard(lobby),
      createdAt: lobby.createdAt,
    };
  }

  private publicLeaderboard(lobby: Lobby): PublicPlayer[] {
    const currentRoundId = lobby.rounds[lobby.currentRoundIndex]?.id;
    return lobby.players
      .map((player) => this.publicPlayer(player, currentRoundId))
      .sort((a, b) => b.totalScore - a.totalScore || a.totalDistanceMeters - b.totalDistanceMeters);
  }

  private publicPlayer(player: Lobby["players"][number], currentRoundId?: string): PublicPlayer {
    const { socketId: _socketId, guesses: _guesses, ...safePlayer } = player;
    return {
      ...safePlayer,
      guessedCurrentRound: currentRoundId ? Boolean(player.guesses[currentRoundId]) : false,
    };
  }

  private createCode(): string {
    let code = "";
    do {
      code = randomCode(4);
    } while (this.lobbies.has(code));
    return code;
  }

  private createPlayer(id: string, socketId: string, name: string, isHost: boolean): Lobby["players"][number] {
    return {
      id,
      socketId,
      name: sanitizePlayerName(name),
      isHost,
      connected: true,
      joinedAt: Date.now(),
      totalScore: 0,
      totalDistanceMeters: 0,
      guesses: {},
    };
  }

  private requireLobby(code: string): Lobby {
    const lobby = this.getLobby(code);
    if (!lobby) throw new Error("Lobby not found.");
    return lobby;
  }

  private requireHostLobby(code: string, socketId: string): Lobby {
    const lobby = this.requireLobby(code);
    if (lobby.hostSocketId !== socketId) throw new Error("Only the host can do that.");
    return lobby;
  }
}

export function sanitizeSettings(settings: MultiplayerSettings): MultiplayerSettings {
  const modeId = ["classic", "no-move", "timed-view"].includes(settings.modeId) ? settings.modeId : "classic";
  return {
    ...settings,
    modeId,
    rounds: clampNumber(settings.rounds, 1, 20),
    roundTimeLimitSeconds: settings.roundTimeLimitSeconds ? clampNumber(settings.roundTimeLimitSeconds, 10, 600) : null,
    viewTimeLimitSeconds: modeId === "timed-view" ? clampNumber(settings.viewTimeLimitSeconds ?? 10, 0.1, 60) : null,
    allowMove: modeId === "classic" ? settings.allowMove : false,
    allowPan: true,
    allowZoom: true,
  };
}

function publicRound(round: Lobby["rounds"][number], revealActual: boolean) {
  const { actualLocation, ...safeRound } = round;
  return revealActual ? { ...safeRound, actualLocation } : safeRound;
}

function randomId(length: number): string {
  let id = "";
  while (id.length < length) {
    id += randomBytes(Math.ceil((length * 3) / 4)).toString("base64url").replace(/[^a-z0-9]/gi, "");
  }
  return id.slice(0, length);
}

function randomCode(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function validatePreparedRound(input: unknown): PreparedRound {
  const candidate = input as PreparedRound;
  if (!candidate?.panoId || !isLatLng(candidate.actualLocation) || !candidate.initialPov || !candidate.zoneId) {
    throw new Error("Invalid prepared round.");
  }
  return {
    zoneId: String(candidate.zoneId),
    panoId: String(candidate.panoId),
    actualLocation: candidate.actualLocation,
    initialPov: {
      heading: Number(candidate.initialPov.heading) || 0,
      pitch: Number(candidate.initialPov.pitch) || 0,
      zoom: Number(candidate.initialPov.zoom) || 0,
    },
  };
}

function isLatLng(value: unknown): value is LatLngLiteral {
  const candidate = value as LatLngLiteral;
  return Number.isFinite(candidate?.lat) && Number.isFinite(candidate?.lng);
}

function timeRemainingForScore(round: Lobby["rounds"][number], settings: MultiplayerSettings, submittedAt: number): number | undefined {
  if (settings.viewTimeLimitSeconds && round.startedAt) {
    return Math.max(0, (round.startedAt + settings.viewTimeLimitSeconds * 1000 - submittedAt) / 1000);
  }
  if (round.endsAt) {
    return Math.max(0, (round.endsAt - submittedAt) / 1000);
  }
  return undefined;
}

function sanitizePlayerName(name: string): string {
  const trimmed = String(name ?? "").trim().replace(/[^\p{L}\p{N} _.'-]/gu, "").slice(0, 20);
  return trimmed || "Player";
}

function normalizeCode(code: string): string {
  return String(code ?? "").trim().toUpperCase();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value) || min));
}
