import { Loader } from "@googlemaps/js-api-loader";

let mapsPromise: Promise<typeof google> | null = null;

export function getApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY. Create .env from .env.example and restart npm run dev.");
  }

  if (!mapsPromise) {
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "streetView", "geometry", "marker"],
    });
    mapsPromise = loader.load();
  }

  const maps = await mapsPromise;
  await Promise.all([
    maps.maps.importLibrary("maps"),
    maps.maps.importLibrary("streetView"),
    maps.maps.importLibrary("geometry"),
    maps.maps.importLibrary("marker"),
  ]);
  return maps;
}

export function humanizeGoogleMapsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ApiNotActivatedMapError")) return "Maps JavaScript API is not enabled for this key.";
  if (message.includes("BillingNotEnabledMapError")) return "Google Maps billing may not be enabled for this project.";
  if (message.includes("Quota")) return "Google Maps quota may be exhausted. Try again later or check billing.";
  return message;
}
