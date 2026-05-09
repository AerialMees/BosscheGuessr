import { describe, expect, it } from "vitest";
import { LobbyManager, PLAYER_INACTIVITY_TIMEOUT_MS } from "./lobbyManager.mjs";

const round = {
  zoneId: "den-bosch",
  panoId: "test-pano",
  actualLocation: { lat: 51.6978, lng: 5.3037 },
  initialPov: { heading: 90, pitch: 0, zoom: 0 },
};

describe("LobbyManager inactivity handling", () => {
  it("updates lastSeenAt on heartbeat", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    const lobby = manager.getLobby(state.code);
    lobby.players[0].lastSeenAt = 1;

    manager.heartbeat(state.code, "host-socket-123");

    expect(lobby.players[0].lastSeenAt).toBeGreaterThan(1);
    expect(lobby.players[0].connected).toBe(true);
  });

  it("does not remove a disconnected player before the timeout", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    manager.joinLobby(state.code, "player-socket-123", "Player");
    const lobby = manager.getLobby(state.code);
    const player = lobby.players[1];
    player.connected = false;
    player.lastSeenAt = Date.now() - PLAYER_INACTIVITY_TIMEOUT_MS + 1_000;

    manager.cleanupInactivePlayers();

    expect(player.removedAt).toBeUndefined();
  });

  it("removes an inactive disconnected player after the timeout", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    manager.joinLobby(state.code, "player-socket-123", "Player");
    const lobby = manager.getLobby(state.code);
    const player = lobby.players[1];
    player.connected = false;
    player.lastSeenAt = Date.now() - PLAYER_INACTIVITY_TIMEOUT_MS - 1_000;

    manager.cleanupInactivePlayers();

    expect(player.removedAt).toBeTypeOf("number");
    expect(player.wasRemovedForInactivity).toBe(true);
  });

  it("removed players do not block round reveal", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    manager.joinLobby(state.code, "player-socket-123", "Player");
    manager.startGame(state.code, "host-socket-123", [round]);
    const lobby = manager.getLobby(state.code);
    manager.submitGuess(state.code, "host-socket-123", lobby.rounds[0].id, round.actualLocation);
    lobby.players[1].connected = false;
    lobby.players[1].lastSeenAt = Date.now() - PLAYER_INACTIVITY_TIMEOUT_MS - 1_000;

    manager.cleanupInactivePlayers();

    expect(lobby.status).toBe("finished");
  });

  it("transfers host after the inactive host is removed", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    const joined = manager.joinLobby(state.code, "player-socket-123", "Player");
    const lobby = manager.getLobby(state.code);
    lobby.players[0].connected = false;
    lobby.players[0].lastSeenAt = Date.now() - PLAYER_INACTIVITY_TIMEOUT_MS - 1_000;

    const [publicState] = manager.cleanupInactivePlayers();

    expect(publicState.players.find((player) => player.id === joined.playerId)?.isHost).toBe(true);
  });

  it("cleans up empty lobbies", () => {
    const manager = new LobbyManager();
    const { state } = manager.createLobby("host-socket-123", "Host");
    const lobby = manager.getLobby(state.code);
    lobby.players[0].connected = false;
    lobby.players[0].lastSeenAt = Date.now() - PLAYER_INACTIVITY_TIMEOUT_MS - 1_000;

    manager.cleanupInactivePlayers();

    expect(manager.getLobby(state.code)).toBeUndefined();
  });
});
