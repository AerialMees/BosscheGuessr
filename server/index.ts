import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { LobbyManager } from "./lobbyManager";
import { getLanUrls } from "./network";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

const SERVER_PORT = Number(process.env.PORT ?? 3001);
const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5173);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});
const lobbyManager = new LobbyManager((code) => broadcastLobby(code, true));

app.get("/api/network-info", (_req, res) => {
  res.json(getLanUrls(CLIENT_PORT));
});

const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("lobby:create", (payload, callback) => {
    try {
      const result = lobbyManager.createLobby(socket.id, payload?.playerName);
      socket.join(result.state.code);
      callback?.({ ok: true, state: result.state, playerId: result.playerId });
      broadcastLobby(result.state.code);
    } catch (error) {
      callback?.({ ok: false, error: errorMessage(error) });
    }
  });

  socket.on("lobby:join", (payload, callback) => {
    try {
      const result = lobbyManager.joinLobby(payload?.code, socket.id, payload?.playerName);
      socket.join(result.state.code);
      callback?.({ ok: true, state: result.state, playerId: result.playerId });
      broadcastLobby(result.state.code);
    } catch (error) {
      callback?.({ ok: false, error: errorMessage(error) });
      socket.emit("lobby:error", errorMessage(error));
    }
  });

  socket.on("lobby:update-settings", (payload) => {
    try {
      const state = lobbyManager.updateSettings(payload.code, socket.id, payload.settingsPatch);
      io.to(state.code).emit("lobby:state", state);
    } catch (error) {
      socket.emit("lobby:error", errorMessage(error));
    }
  });

  socket.on("game:start", (payload) => {
    try {
      const state = lobbyManager.startGame(payload.code, socket.id, payload.preparedRounds);
      io.to(state.code).emit("lobby:state", state);
    } catch (error) {
      socket.emit("lobby:error", errorMessage(error));
    }
  });

  socket.on("round:submit-guess", (payload) => {
    try {
      const result = lobbyManager.submitGuess(payload.code, socket.id, payload.roundId, payload.guessLocation);
      io.to(result.state.code).emit("lobby:state", result.state);
      if (result.results) io.to(result.state.code).emit("round:results", result.results);
    } catch (error) {
      socket.emit("lobby:error", errorMessage(error));
    }
  });

  socket.on("round:next", (payload) => {
    try {
      const state = lobbyManager.nextRound(payload.code, socket.id);
      io.to(state.code).emit("lobby:state", state);
    } catch (error) {
      socket.emit("lobby:error", errorMessage(error));
    }
  });

  socket.on("lobby:leave", (payload) => {
    socket.leave(payload.code);
    for (const state of lobbyManager.leave(socket.id)) {
      io.to(state.code).emit("lobby:state", state);
    }
  });

  socket.on("disconnect", () => {
    for (const state of lobbyManager.leave(socket.id)) {
      io.to(state.code).emit("lobby:state", state);
    }
  });
});

setInterval(() => lobbyManager.cleanupOldLobbies(), 30 * 60 * 1000);

server.listen(SERVER_PORT, "0.0.0.0", () => {
  const { lanUrls } = getLanUrls(CLIENT_PORT);
  console.log(`BosscheGuessr multiplayer server listening on http://0.0.0.0:${SERVER_PORT}`);
  if (lanUrls.length) console.log(`LAN client URLs:\n${lanUrls.join("\n")}`);
});

function broadcastLobby(code: string, includeResults = false): void {
  const publicState = lobbyManager.getPublicState(code, includeResults);
  if (publicState) io.to(code).emit("lobby:state", publicState);
  if (includeResults) {
    const results = lobbyManager.roundResultsFor(code);
    if (results) io.to(code).emit("round:results", results);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
