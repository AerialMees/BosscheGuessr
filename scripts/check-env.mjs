import { existsSync, readFileSync } from "node:fs";
import { loadEnv } from "vite";

const envPath = ".env";
const raw = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const viteEnv = loadEnv("development", process.cwd(), "");
const apiKey = viteEnv.VITE_GOOGLE_MAPS_API_KEY?.trim();
const debugTools = viteEnv.VITE_ENABLE_DEBUG_TOOLS ?? "(not set)";
const serverUrl = viteEnv.VITE_MULTIPLAYER_SERVER_URL ?? "(auto)";

const issues = [];
if (!existsSync(envPath)) issues.push("Missing .env in the project root.");
if (!apiKey) issues.push("VITE_GOOGLE_MAPS_API_KEY is missing or empty.");
if (apiKey && looksPlaceholder(apiKey)) issues.push("VITE_GOOGLE_MAPS_API_KEY still looks like a placeholder.");
if (raw.charCodeAt(0) === 0xfeff) issues.push(".env starts with a UTF-8 BOM; remove it if Vite behaves strangely.");

console.log("BosscheGuessr environment check");
console.log(`.env present: ${existsSync(envPath) ? "yes" : "no"}`);
console.log(`Vite sees API key: ${apiKey ? "yes" : "no"}`);
console.log(`Masked key: ${mask(apiKey) ?? "(none)"}`);
console.log(`Key length: ${apiKey?.length ?? 0}`);
console.log(`Debug tools: ${debugTools}`);
console.log(`Multiplayer server URL: ${serverUrl}`);

if (issues.length) {
  console.log("\nIssues:");
  for (const issue of issues) console.log(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("\nLooks good. If Maps still rejects the key, restart Vite and check Google Cloud API/billing/referrer restrictions.");
  console.log("For LAN play, add your exact LAN referrer, for example http://192.168.1.42:5173/*.");
}

function mask(value) {
  if (!value) return undefined;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function looksPlaceholder(value) {
  const normalized = value.toLowerCase();
  return normalized.includes("your_key") || normalized.includes("replace_with") || normalized.includes("your_google") || normalized === "your_api_key";
}
