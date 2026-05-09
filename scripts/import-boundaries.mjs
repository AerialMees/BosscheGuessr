import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OUTPUT_DIR = path.resolve("src/data/boundaries");

const targets = [
  { id: "den-bosch", names: ["'s-Hertogenbosch", "Den Bosch"], note: "Municipality is broad; usually gameplay-tune after import." },
  { id: "engelen", names: ["Engelen"], note: "Likely place/suburb data rather than official village boundary." },
  { id: "empel", names: ["Empel"], note: "Likely place/suburb data; keep gameplay polygon tight." },
  { id: "rosmalen", names: ["Rosmalen"], note: "May have useful place relation/way." },
  { id: "kerkdriel", names: ["Kerkdriel"], note: "Village in Maasdriel; inspect imported area before use." },
];

if (process.argv.includes("--help") || !process.argv.includes("--fetch")) {
  console.log("BosscheGuessr boundary importer");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/import-boundaries.mjs --fetch");
  console.log("");
  console.log("This developer script queries Overpass for candidate OSM boundaries/place polygons and writes raw GeoJSON");
  console.log("to src/data/boundaries/. Runtime gameplay never calls Overpass.");
  console.log("");
  console.log("Always manually inspect/simplify/tune the result before wiring it into zones.ts.");
  for (const target of targets) console.log(`- ${target.id}: ${target.note}`);
  process.exit(0);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const target of targets) {
  const query = buildOverpassQuery(target.names);
  console.log(`Fetching ${target.id}...`);
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) {
    console.warn(`Failed ${target.id}: ${response.status} ${response.statusText}`);
    continue;
  }
  const osmJson = await response.json();
  const outputPath = path.join(OUTPUT_DIR, `${target.id}.raw-overpass.json`);
  writeFileSync(outputPath, JSON.stringify(osmJson, null, 2));
  console.log(`Wrote ${outputPath}`);
}

function buildOverpassQuery(names) {
  const nameFilters = names.map((name) => `["name"="${name}"]`).join("");
  return `
[out:json][timeout:60];
area["ISO3166-1"="NL"][admin_level=2]->.nl;
(
  relation${nameFilters}["boundary"="administrative"](area.nl);
  relation${nameFilters}["place"](area.nl);
  way${nameFilters}["place"](area.nl);
);
out body geom;
`;
}
