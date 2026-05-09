import { randomBytes } from "node:crypto";
import { distanceMeters } from "./geo.mjs";
import { calculateScore, scoringScaleForZone } from "./scoring.mjs";

const DEFAULT_SETTINGS = {
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

export const PLAYER_INACTIVITY_TIMEOUT_MS = 120_000;

export class LobbyManager {
  lobbies = new Map();
  onRoundExpired;

  constructor(onRoundExpired) {
    this.onRoundExpired = onRoundExpired;
  }

  createLobby(socketId, playerName) {
    const code = this.createCode();
    const playerId = randomId(10);
    const lobby = {
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

  joinLobby(codeInput, socketId, playerName) {
    const lobby = this.requireLobby(codeInput);
    const now = Date.now();
    const existing = lobby.players.find((player) => player.name.toLowerCase() === sanitizePlayerName(playerName).toLowerCase() && !player.removedAt && !player.connected);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      existing.lastSeenAt = now;
      existing.disconnectedAt = undefined;
      if (existing.isHost) lobby.hostSocketId = socketId;
      return { state: this.toPublicState(lobby), playerId: existing.id };
    }

    const playerId = randomId(10);
    lobby.players.push(this.createPlayer(playerId, socketId, playerName, false));
    return { state: this.toPublicState(lobby), playerId };
  }

  updateSettings(code, socketId, patch) {
    const lobby = this.requireHostLobby(code, socketId);
    this.touchPlayer(lobby, socketId);
    if (lobby.status !== "waiting") throw new Error("Settings can only be changed before the game starts.");
    lobby.settings = sanitizeSettings({ ...lobby.settings, ...patch });
    return this.toPublicState(lobby);
  }

  startGame(code, socketId, preparedRoundsInput) {
    const lobby = this.requireHostLobby(code, socketId);
    this.touchPlayer(lobby, socketId);
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

  submitGuess(code, socketId, roundId, guessLocation) {
    const lobby = this.requireLobby(code);
    this.touchPlayer(lobby, socketId);
    if (lobby.status !== "in-round") throw new Error("This round is not accepting guesses.");
    const player = lobby.players.find((candidate) => candidate.socketId === socketId && candidate.connected && !candidate.removedAt);
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

  nextRound(code, socketId) {
    const lobby = this.requireHostLobby(code, socketId);
    this.touchPlayer(lobby, socketId);
    if (lobby.status !== "round-results") throw new Error("Round results are not ready.");
    if (lobby.currentRoundIndex >= lobby.rounds.length - 1) {
      lobby.status = "finished";
      return this.toPublicState(lobby, true);
    }
    lobby.currentRoundIndex += 1;
    this.startCurrentRound(lobby);
    return this.toPublicState(lobby);
  }

  leave(socketId) {
    const changed = [];
    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((candidate) => candidate.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.disconnectedAt = Date.now();
      if (lobby.status === "in-round") {
        const round = lobby.rounds[lobby.currentRoundIndex];
        if (round && this.everyoneConnectedGuessed(lobby, round.id) && lobby.settings.showRoundResultsAfterEveryoneGuessed) {
          this.finishRound(lobby);
        }
      }
      changed.push(this.toPublicState(lobby, lobby.status !== "in-round"));
    }
    return changed;
  }

  heartbeat(code, socketId) {
    const lobby = this.requireLobby(code);
    this.touchPlayer(lobby, socketId);
    return this.toPublicState(lobby, lobby.status !== "in-round");
  }

  getLobby(code) {
    return this.lobbies.get(normalizeCode(code));
  }

  getPublicState(code, revealActual = false) {
    const lobby = this.getLobby(code);
    return lobby ? this.toPublicState(lobby, revealActual) : null;
  }

  roundResultsFor(code) {
    const lobby = this.getLobby(code);
    if (!lobby || (lobby.status !== "round-results" && lobby.status !== "finished")) return null;
    return this.roundResults(lobby);
  }

  cleanupOldLobbies(maxAgeMs = 6 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [code, lobby] of this.lobbies) {
      if (now - lobby.createdAt > maxAgeMs) {
        if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
        this.lobbies.delete(code);
      }
    }
  }

  cleanupInactivePlayers(timeoutMs = PLAYER_INACTIVITY_TIMEOUT_MS) {
    const now = Date.now();
    const changed = [];
    for (const [code, lobby] of this.lobbies) {
      let lobbyChanged = false;
      for (const player of lobby.players) {
        if (player.removedAt) continue;
        if (now - (player.lastSeenAt ?? player.joinedAt) <= timeoutMs) continue;
        player.connected = false;
        player.removedAt = now;
        player.disconnectedAt ??= now;
        player.wasRemovedForInactivity = true;
        lobbyChanged = true;
      }

      if (lobbyChanged) {
        this.ensureActiveHost(lobby);
        if (lobby.players.every((player) => player.removedAt)) {
          if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
          this.lobbies.delete(code);
          continue;
        }
        if (lobby.status === "in-round") {
          const round = lobby.rounds[lobby.currentRoundIndex];
          if (round && this.everyoneConnectedGuessed(lobby, round.id) && lobby.settings.showRoundResultsAfterEveryoneGuessed) {
            this.finishRound(lobby);
          }
        }
        changed.push(this.toPublicState(lobby, lobby.status !== "in-round"));
      }
    }
    return changed;
  }

  startCurrentRound(lobby) {
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

  finishRound(lobby) {
    if (lobby.roundTimer) clearTimeout(lobby.roundTimer);
    lobby.status = lobby.currentRoundIndex >= lobby.rounds.length - 1 ? "finished" : "round-results";
    return this.toPublicState(lobby, true);
  }

  roundResults(lobby) {
    const round = lobby.rounds[lobby.currentRoundIndex];
    return {
      round: { ...round, actualLocation: round.actualLocation },
      playerResults: round.guesses
        .map((guess) => ({ ...guess, playerName: lobby.players.find((player) => player.id === guess.playerId)?.name ?? "Player" }))
        .sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters),
      leaderboard: this.publicLeaderboard(lobby),
    };
  }

  everyoneConnectedGuessed(lobby, roundId) {
    const connectedPlayers = lobby.players.filter((player) => player.connected && !player.removedAt);
    return connectedPlayers.length > 0 && connectedPlayers.every((player) => Boolean(player.guesses[roundId]));
  }

  toPublicState(lobby, revealActual = false) {
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

  publicLeaderboard(lobby) {
    const currentRoundId = lobby.rounds[lobby.currentRoundIndex]?.id;
    return lobby.players
      .filter((player) => !player.removedAt)
      .map((player) => this.publicPlayer(player, currentRoundId))
      .sort((a, b) => b.totalScore - a.totalScore || a.totalDistanceMeters - b.totalDistanceMeters);
  }

  publicPlayer(player, currentRoundId) {
    const { socketId: _socketId, guesses: _guesses, ...safePlayer } = player;
    return {
      ...safePlayer,
      guessedCurrentRound: currentRoundId ? Boolean(player.guesses[currentRoundId]) : false,
    };
  }

  createCode() {
    let code = "";
    do {
      code = randomCode(4);
    } while (this.lobbies.has(code));
    return code;
  }

  createPlayer(id, socketId, name, isHost) {
    return {
      id,
      socketId,
      name: sanitizePlayerName(name),
      isHost,
      connected: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      disconnectedAt: undefined,
      removedAt: undefined,
      wasRemovedForInactivity: false,
      totalScore: 0,
      totalDistanceMeters: 0,
      guesses: {},
    };
  }

  requireLobby(code) {
    const lobby = this.getLobby(code);
    if (!lobby) throw new Error("Lobby not found.");
    return lobby;
  }

  requireHostLobby(code, socketId) {
    const lobby = this.requireLobby(code);
    if (lobby.hostSocketId !== socketId) throw new Error("Only the host can do that.");
    return lobby;
  }

  touchPlayer(lobby, socketId) {
    const player = lobby.players.find((candidate) => candidate.socketId === socketId && !candidate.removedAt);
    if (!player) return;
    player.connected = true;
    player.lastSeenAt = Date.now();
    player.disconnectedAt = undefined;
  }

  ensureActiveHost(lobby) {
    const currentHost = lobby.players.find((player) => player.socketId === lobby.hostSocketId && !player.removedAt);
    if (currentHost) {
      lobby.players.forEach((player) => {
        player.isHost = player.id === currentHost.id;
      });
      return;
    }
    const nextHost = lobby.players.find((player) => player.connected && !player.removedAt) ?? lobby.players.find((player) => !player.removedAt);
    if (!nextHost) return;
    lobby.hostSocketId = nextHost.socketId;
    lobby.players.forEach((player) => {
      player.isHost = player.id === nextHost.id;
    });
  }
}

export function sanitizeSettings(settings) {
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

function publicRound(round, revealActual) {
  const { actualLocation, ...safeRound } = round;
  return revealActual ? { ...safeRound, actualLocation } : safeRound;
}

function randomId(length) {
  let id = "";
  while (id.length < length) {
    id += randomBytes(Math.ceil((length * 3) / 4)).toString("base64url").replace(/[^a-z0-9]/gi, "");
  }
  return id.slice(0, length);
}

function randomCode(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function validatePreparedRound(input) {
  const candidate = input;
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

function isLatLng(value) {
  return Number.isFinite(value?.lat) && Number.isFinite(value?.lng);
}

function timeRemainingForScore(round, settings, submittedAt) {
  if (settings.viewTimeLimitSeconds && round.startedAt) {
    return Math.max(0, (round.startedAt + settings.viewTimeLimitSeconds * 1000 - submittedAt) / 1000);
  }
  if (round.endsAt) {
    return Math.max(0, (round.endsAt - submittedAt) / 1000);
  }
  return undefined;
}

function sanitizePlayerName(name) {
  const trimmed = String(name ?? "").trim().replace(/[^\p{L}\p{N} _.'-]/gu, "").slice(0, 20);
  return trimmed || "Player";
}

function normalizeCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}
