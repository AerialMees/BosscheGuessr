import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LobbyManager } from "./lobbyManager.mjs";
import { getLanUrls } from "./network.mjs";

const SERVER_PORT = Number(process.env.PORT ?? 3001);
const REQUESTED_SERVER_HOST = process.env.SERVER_HOST ?? "0.0.0.0";
let activeServerHost = REQUESTED_SERVER_HOST;
const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5173);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");

console.log("Starting BosscheGuessr multiplayer backend...");

const lobbyManager = new LobbyManager(() => undefined);
const server = http.createServer(handleHttpRequest);

setInterval(() => lobbyManager.cleanupOldLobbies(), 30 * 60 * 1000);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${SERVER_PORT} is already in use. Stop the other server or run with PORT=3002 npm run dev:server.`);
    process.exit(1);
  }
  if (error.code === "EACCES" || error.code === "EPERM") {
    if (activeServerHost === "0.0.0.0") {
      console.warn(`Could not bind the multiplayer server on 0.0.0.0:${SERVER_PORT}. Falling back to localhost.`);
      console.warn("LAN joining will not work in this fallback mode, but localhost should still work on this Mac.");
      activeServerHost = "127.0.0.1";
      server.listen(SERVER_PORT, activeServerHost);
      return;
    }
    console.error(`Could not bind the multiplayer server on ${activeServerHost}:${SERVER_PORT}.`);
    console.error("On macOS, allow Node/Terminal through the firewall, or try a normal Terminal window outside sandboxed tools.");
    process.exit(1);
  }
  throw error;
});

server.listen(SERVER_PORT, activeServerHost, () => {
  const { lanUrls } = getLanUrls(CLIENT_PORT);
  console.log(`BosscheGuessr multiplayer server listening on http://${activeServerHost}:${SERVER_PORT}`);
  if (activeServerHost === "0.0.0.0" && lanUrls.length) console.log(`LAN client URLs:\n${lanUrls.join("\n")}`);
});

async function handleHttpRequest(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    if (requestUrl.pathname === "/api/network-info" && req.method === "GET") {
      sendJson(res, getLanUrls(CLIENT_PORT));
      return;
    }

    if (requestUrl.pathname === "/api/health" && req.method === "GET") {
      sendJson(res, { ok: true, status: "healthy", service: "bosscheguessr-server", timestamp: new Date().toISOString() });
      return;
    }

    if (requestUrl.pathname === "/api/host-info" && req.method === "GET") {
      sendJson(res, getHostInfo());
      return;
    }

    if (requestUrl.pathname === "/api/lobby/create" && req.method === "POST") {
      const body = await readJson(req);
      const result = lobbyManager.createLobby(requireClientId(body), body.playerName);
      sendJson(res, { ok: true, ...result });
      return;
    }

    if (requestUrl.pathname === "/api/lobby/join" && req.method === "POST") {
      const body = await readJson(req);
      const result = lobbyManager.joinLobby(body.code, requireClientId(body), body.playerName);
      sendJson(res, { ok: true, ...result });
      return;
    }

    const lobbyMatch = requestUrl.pathname.match(/^\/api\/lobby\/([^/]+)(?:\/([^/]+))?$/);
    if (lobbyMatch) {
      const code = lobbyMatch[1];
      const action = lobbyMatch[2] ?? "state";

      if (action === "state" && req.method === "GET") {
        const state = lobbyManager.getPublicState(code);
        if (!state) throw new HttpError(404, "Lobby not found.");
        sendJson(res, { ok: true, state });
        return;
      }

      if (action === "results" && req.method === "GET") {
        const results = lobbyManager.roundResultsFor(code);
        sendJson(res, { ok: true, results });
        return;
      }

      const body = await readJson(req);

      if (action === "settings" && req.method === "POST") {
        const state = lobbyManager.updateSettings(code, requireClientId(body), body.settingsPatch);
        sendJson(res, { ok: true, state });
        return;
      }

      if (action === "start" && req.method === "POST") {
        const state = lobbyManager.startGame(code, requireClientId(body), body.preparedRounds);
        sendJson(res, { ok: true, state });
        return;
      }

      if (action === "guess" && req.method === "POST") {
        const result = lobbyManager.submitGuess(code, requireClientId(body), body.roundId, body.guessLocation);
        sendJson(res, { ok: true, ...result });
        return;
      }

      if (action === "next" && req.method === "POST") {
        const state = lobbyManager.nextRound(code, requireClientId(body));
        sendJson(res, { ok: true, state });
        return;
      }

      if (action === "leave" && req.method === "POST") {
        lobbyManager.leave(requireClientId(body));
        sendJson(res, { ok: true });
        return;
      }
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      throw new HttpError(404, "Unknown API endpoint.");
    }

    serveStaticFile(requestUrl.pathname, res);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    sendJson(res, { ok: false, error: errorMessage(error) }, status);
  }
}

function serveStaticFile(urlPath, res) {
  const relativePath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const requestedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distPath, requestedPath);
  const fallbackPath = path.join(distPath, "index.html");
  const candidate = fileExists(filePath) ? filePath : fallbackPath;

  if (!fileExists(candidate)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("BosscheGuessr dev server is running. Build the client first for production static serving.");
    return;
  }

  res.writeHead(200, { "content-type": contentType(candidate) });
  createReadStream(candidate).pipe(res);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new HttpError(413, "Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, "Invalid JSON request."));
      }
    });
    req.on("error", reject);
  });
}

function fileExists(filePath) {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function setCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function getHostInfo() {
  const { lanUrls } = getLanUrls(CLIENT_PORT);
  const lanSocketUrls = lanUrls.map((url) => url.replace(`:${CLIENT_PORT}`, `:${SERVER_PORT}`));
  const localIps = lanUrls.map((url) => new URL(url).hostname);
  return {
    localIps,
    frontendPort: CLIENT_PORT,
    socketPort: SERVER_PORT,
    localFrontendUrl: `http://localhost:${CLIENT_PORT}`,
    lanFrontendUrls: lanUrls,
    localSocketUrl: `http://localhost:${SERVER_PORT}`,
    lanSocketUrls: activeServerHost === "0.0.0.0" ? lanSocketUrls : [],
    lanEnabled: activeServerHost === "0.0.0.0",
  };
}

function requireClientId(body) {
  if (typeof body.clientId !== "string" || body.clientId.trim().length < 8) {
    throw new HttpError(400, "Missing multiplayer client id.");
  }
  return body.clientId.trim().slice(0, 100);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
