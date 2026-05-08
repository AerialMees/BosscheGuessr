import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import net from "node:net";
import os from "node:os";

const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5173);
const SERVER_PORT = Number(process.env.PORT ?? 3001);
const LAUNCH_VERBOSE = process.env.LAUNCH_VERBOSE === "true";
const STABILITY_MS = 1500;
const RESTART_WINDOW_MS = 30_000;
const env = readDotEnv();
const apiKey = env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const issues = getEnvIssues(apiKey);
const launchState = {
  ready: false,
  clientResponding: false,
  serverResponding: false,
  clientStarted: false,
  serverStarted: false,
  stableSince: 0,
  lastClientRestartAt: 0,
  clientRestartTimes: [],
  warnedRestartLoop: false,
  recentClientConfigLines: [],
};
let spinnerIndex = 0;
let lastRenderedBars = "";

printHeader();
renderStatusBars({ env: "running", ports: "waiting", server: "waiting", client: "waiting", stability: "waiting" });

if (issues.length) {
  renderStatusBars({ env: "failed", ports: "waiting", server: "waiting", client: "waiting", stability: "waiting" });
  console.log("Setup needs attention before launch:\n");
  for (const issue of issues) console.log(`- ${issue}`);
  console.log("\nFix .env, then run npm run launch again.");
  process.exit(1);
}
renderStatusBars({ env: "done", ports: "running", server: "waiting", client: "waiting", stability: "waiting" });

const { issues: portIssues, warnings: portWarnings } = await getPortPreflight();
if (portIssues.length) {
  renderStatusBars({ env: "done", ports: "failed", server: "waiting", client: "waiting", stability: "waiting" });
  console.log("Cannot launch yet:\n");
  for (const issue of portIssues) console.log(`- ${issue}`);
  console.log("\nStop the old BosscheGuessr terminal/window, then run npm run launch again.");
  console.log(`If you intentionally want another client port, run CLIENT_PORT=5174 npm run launch and add that port to Google referrers.`);
  process.exit(1);
}
renderStatusBars({ env: "done", ports: "done", server: "waiting", client: "waiting", stability: "waiting" });
for (const warning of portWarnings) console.log(`Warning: ${warning}`);

const lanUrls = getLanUrls(CLIENT_PORT);
console.log("Environment OK");
console.log(`Google Maps key: ${mask(apiKey)}`);
console.log("");
console.log("Starting BosscheGuessr services...");
console.log(`  Client: http://localhost:${CLIENT_PORT}`);
console.log(`  Server: http://localhost:${SERVER_PORT}`);
console.log("Waiting for both services to respond before opening the game.");
console.log("");

const childEnv = {
  ...process.env,
  CLIENT_PORT: String(CLIENT_PORT),
  PORT: String(SERVER_PORT),
};
const viteBin = process.platform === "win32" ? path.resolve("node_modules/.bin/vite.cmd") : path.resolve("node_modules/.bin/vite");
const children = [
  startChild("client", viteBin, ["--host", "0.0.0.0", "--port", String(CLIENT_PORT), "--strictPort"], childEnv),
  startChild("server", process.execPath, ["server/index.mjs"], childEnv),
];

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopChildren(signal));
}

await waitUntilReady();
console.log("");
console.log("BosscheGuessr is running. Press Ctrl+C here to stop everything.");

function startChild(label, command, args, env) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });

  console.log(`[${label}] starting pid ${child.pid ?? "unknown"}`);
  if (label === "client") launchState.clientStarted = true;
  if (label === "server") launchState.serverStarted = true;
  child.stdout.on("data", (data) => writePrefixed(label, data));
  child.stderr.on("data", (data) => writePrefixed(label, data));
  child.on("error", (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    stopChildren("SIGTERM", 1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code === 0 || signal) return;
    console.error(`[${label}] exited with code ${code}. Stopping BosscheGuessr.`);
    stopChildren("SIGTERM", code ?? 1);
  });

  return child;
}

function writePrefixed(label, data) {
  for (const line of data.toString().split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    handleChildLine(label, trimmed);
    if (shouldPrintLine(label, trimmed)) console.log(`[${label}] ${trimmed}`);
  }
}

function handleChildLine(label, line) {
  if (label !== "client") return;
  const lower = line.toLowerCase();
  const isRestartLine =
    lower.includes("restarting server") ||
    lower.includes("server restarted") ||
    lower.includes("changed tsconfig") ||
    lower.includes("vite.config") ||
    lower.includes(".env changed");
  if (!isRestartLine) return;

  launchState.lastClientRestartAt = Date.now();
  launchState.stableSince = 0;
  launchState.clientRestartTimes = [...launchState.clientRestartTimes.filter((time) => Date.now() - time < RESTART_WINDOW_MS), Date.now()];
  launchState.recentClientConfigLines = [...launchState.recentClientConfigLines, line].slice(-8);

  if (launchState.clientRestartTimes.length > 3 && !launchState.warnedRestartLoop) {
    launchState.warnedRestartLoop = true;
    console.log("");
    console.log("Warning: Vite is restarting repeatedly. Something is touching config/env files.");
    console.log("Recent client restart lines:");
    for (const recentLine of launchState.recentClientConfigLines) console.log(`  ${recentLine}`);
    console.log("BosscheGuessr will keep running, but the launcher will not claim Ready until Vite is stable.");
    console.log("");
  } else if (!launchState.ready) {
    console.log("Client restarted, waiting for stability...");
  }
}

function shouldPrintLine(label, line) {
  if (LAUNCH_VERBOSE) return true;
  if (!launchState.ready) return true;
  if (label === "client" && line.includes("[vite]") && line.includes("hmr update")) return false;
  return true;
}

function stopChildren(signal = "SIGTERM", exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(exitCode), 250);
}

function printHeader() {
  console.log("");
  console.log("======================================");
  console.log("        BOSSCHE GUESSR LAUNCH");
  console.log("======================================");
  console.log("");
}

async function waitUntilReady() {
  const startedAt = Date.now();
  let lastStatus = "";
  let slowWarningPrinted = false;

  while (!shuttingDown) {
    const [serverOk, clientOk] = await Promise.all([
      isHttpHealthy(`http://localhost:${SERVER_PORT}/api/health`),
      isHttpHealthy(`http://localhost:${CLIENT_PORT}`),
    ]);

    launchState.serverResponding = serverOk;
    launchState.clientResponding = clientOk;
    renderStatusBars({
      env: "done",
      ports: "done",
      server: serverOk ? "done" : launchState.serverStarted ? "running" : "waiting",
      client: clientOk ? "done" : launchState.clientStarted ? "running" : "waiting",
      stability: launchState.stableSince ? "running" : "waiting",
    });

    const recentlyRestarted = Date.now() - launchState.lastClientRestartAt < STABILITY_MS;
    if (serverOk && clientOk && !recentlyRestarted) {
      if (!launchState.stableSince) launchState.stableSince = Date.now();
      if (Date.now() - launchState.stableSince >= STABILITY_MS) {
        launchState.ready = true;
        renderStatusBars({ env: "done", ports: "done", server: "done", client: "done", stability: "done" });
        printReady(lanUrls);
        return;
      }
    } else {
      launchState.stableSince = 0;
    }

    const status = `${spinner()} client:${clientOk ? "ok" : "waiting"} server:${serverOk ? "ok" : "waiting"}`;
    if (status !== lastStatus) {
      console.log(status);
      lastStatus = status;
    }

    if (!slowWarningPrinted && Date.now() - startedAt > 20_000) {
      slowWarningPrinted = true;
      console.log("");
      console.log("Still waiting. Do not open localhost yet if the launcher has not printed Ready.");
      console.log("If this stays here, check the [client] and [server] lines above for errors or restart-loop warnings.");
      console.log("");
    }

    await delay(500);
  }
}

function printReady(urls) {
  console.log("");
  console.log("Ready.");
  console.log("Open on this Mac:");
  console.log(`  http://localhost:${CLIENT_PORT}`);
  console.log("");
  if (urls.length) {
    console.log("Friends on the same Wi-Fi can try:");
    for (const url of urls) console.log(`  ${url}`);
    console.log("");
    console.log("Google Maps LAN referrer reminder:");
    for (const url of urls) console.log(`  ${url}/*`);
  } else {
    console.log("No LAN IPv4 address found yet. Check Wi-Fi if friends cannot join.");
  }
  console.log("");
  console.log("University Wi-Fi note:");
  console.log("  localhost should still work on this Mac.");
  console.log("  Friends joining via LAN IP may be blocked by client isolation.");
  console.log("  Try a hotspot/home Wi-Fi if the LAN URL does not work from other devices.");
}

function renderStatusBars(steps) {
  const lines = [
    statusBar("Env", steps.env),
    statusBar("Ports", steps.ports),
    statusBar("Server", steps.server),
    statusBar("Client", steps.client),
    statusBar("Stable", steps.stability),
  ];
  const output = lines.join("\n");
  if (output === lastRenderedBars) return;
  lastRenderedBars = output;
  console.log(output);
  console.log("");
}

function statusBar(label, state) {
  const width = 18;
  const filledByState = {
    waiting: 0,
    running: Math.max(3, Math.floor(width / 2)),
    done: width,
    failed: width,
  };
  const iconByState = {
    waiting: " ",
    running: spinner(),
    done: "✓",
    failed: "!",
  };
  const textByState = {
    waiting: "waiting",
    running: "working",
    done: "ready",
    failed: "failed",
  };
  const filled = filledByState[state] ?? 0;
  const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
  return `${iconByState[state]} ${label.padEnd(7)} [${bar}] ${textByState[state]}`;
}

async function isHttpHealthy(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function spinner() {
  const frames = ["-", "\\", "|", "/"];
  const frame = frames[spinnerIndex % frames.length];
  spinnerIndex += 1;
  return frame;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnvIssues(value) {
  const issues = [];
  if (!existsSync(".env")) issues.push("Missing .env in the project root.");
  if (!value) issues.push("VITE_GOOGLE_MAPS_API_KEY is missing or empty.");
  if (value && looksPlaceholder(value)) issues.push("VITE_GOOGLE_MAPS_API_KEY still looks like the placeholder value.");
  if (existsSync(".env")) {
    const raw = readFileSync(".env", "utf8");
    if (raw.charCodeAt(0) === 0xfeff) issues.push(".env starts with a UTF-8 BOM; recreate it as plain text.");
  }
  return issues;
}

function readDotEnv() {
  if (!existsSync(".env")) return {};
  const entries = {};
  const raw = readFileSync(".env", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    entries[key] = value;
  }
  return entries;
}

function getLanUrls(port) {
  const urls = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      urls.push(`http://${address.address}:${port}`);
    }
  }
  return urls;
}

async function getPortPreflight() {
  const checks = [
    { port: CLIENT_PORT, label: "Vite client" },
    { port: SERVER_PORT, label: "multiplayer server" },
  ];
  const results = await Promise.all(checks.map(async (check) => ({ ...check, status: await getPortStatus(check.port) })));
  return {
    issues: results
      .filter((result) => result.status === "unavailable")
      .map((result) => `${result.label} port ${result.port} is already in use.`),
    warnings: results
      .filter((result) => result.status === "unknown")
      .map((result) => `Could not pre-check ${result.label} port ${result.port} from this terminal. Continuing anyway.`),
  };
}

function getPortStatus(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close(() => resolve("unavailable"));
    }, 750);
    server.once("error", (error) => {
      clearTimeout(timeout);
      if (error?.code === "EACCES" || error?.code === "EPERM") {
        resolve("unknown");
        return;
      }
      resolve("unavailable");
    });
    server.once("listening", () => {
      clearTimeout(timeout);
      server.close(() => resolve("available"));
    });
    server.listen(port, "127.0.0.1");
  });
}

function mask(value) {
  if (!value) return "(none)";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function looksPlaceholder(value) {
  const normalized = value.toLowerCase();
  return normalized.includes("your_key") || normalized.includes("replace_with") || normalized.includes("your_google") || normalized === "your_api_key";
}
