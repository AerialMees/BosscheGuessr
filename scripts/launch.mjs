import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { loadEnv } from "vite";

const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5173);
const SERVER_PORT = Number(process.env.PORT ?? 3001);
const env = loadEnv("development", process.cwd(), "");
const apiKey = env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const issues = getEnvIssues(apiKey);

printHeader();

if (issues.length) {
  console.log("Setup needs attention before launch:\n");
  for (const issue of issues) console.log(`- ${issue}`);
  console.log("\nFix .env, then run npm run launch again.");
  process.exit(1);
}

const lanUrls = getLanUrls(CLIENT_PORT);
console.log("Environment OK");
console.log(`Google Maps key: ${mask(apiKey)}`);
console.log("");
console.log("Open on this Mac:");
console.log(`  http://localhost:${CLIENT_PORT}`);
console.log("");
if (lanUrls.length) {
  console.log("Friends on the same Wi-Fi can try:");
  for (const url of lanUrls) console.log(`  ${url}`);
  console.log("");
  console.log("Google Maps LAN referrer reminder:");
  for (const url of lanUrls) console.log(`  ${url}/*`);
} else {
  console.log("No LAN IPv4 address found yet. Check Wi-Fi if friends cannot join.");
}
console.log("");
console.log("Starting BosscheGuessr. Press Ctrl+C here to stop everything.");
console.log("");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(
  command,
  [
    "concurrently",
    "--kill-others-on-fail",
    "--names",
    "client,server",
    "--prefix-colors",
    "cyan,magenta",
    `vite --host 0.0.0.0 --port ${CLIENT_PORT}`,
    `node --import tsx server/index.ts`,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CLIENT_PORT: String(CLIENT_PORT),
      PORT: String(SERVER_PORT),
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

function printHeader() {
  console.log("");
  console.log("======================================");
  console.log("        BOSSCHE GUESSR LAUNCH");
  console.log("======================================");
  console.log("");
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

function mask(value) {
  if (!value) return "(none)";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function looksPlaceholder(value) {
  const normalized = value.toLowerCase();
  return normalized.includes("your_key") || normalized.includes("replace_with") || normalized.includes("your_google") || normalized === "your_api_key";
}
