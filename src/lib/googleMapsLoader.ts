import { Loader } from "@googlemaps/js-api-loader";
import { explainGoogleMapsError, GoogleMapsLoadError } from "./googleMapsErrors";

let mapsPromise: Promise<typeof google> | null = null;
let authFailureHandler: ((error: GoogleMapsLoadError) => void) | null = null;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export function getApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(getApiKey()?.trim());
}

export function maskApiKey(apiKey = getApiKey()): string | undefined {
  const trimmed = apiKey?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export function setGoogleMapsAuthFailureHandler(handler: (error: GoogleMapsLoadError) => void): void {
  authFailureHandler = handler;
  window.gm_authFailure = () => {
    const error = explainGoogleMapsError("Google Maps authentication failed. Check DevTools for the exact Maps error code.");
    debugMaps("auth failure", { code: error.code });
    authFailureHandler?.(error);
  };
}

export async function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getApiKey()?.trim();
  if (!apiKey) {
    throw new GoogleMapsLoadError({
      code: "MISSING_API_KEY",
      message: "Missing VITE_GOOGLE_MAPS_API_KEY.",
      userFix: "Create .env from .env.example, set VITE_GOOGLE_MAPS_API_KEY=your_real_key, then restart npm run dev.",
    });
  }
  if (isPlaceholderKey(apiKey)) {
    throw new GoogleMapsLoadError({
      code: "PLACEHOLDER_API_KEY",
      message: "VITE_GOOGLE_MAPS_API_KEY still looks like a placeholder value.",
      userFix: "Replace the placeholder in .env with a real Google Maps JavaScript API key, then restart npm run dev.",
    });
  }

  if (!mapsPromise) {
    debugMaps("load start", {
      origin: window.location.origin,
      hasApiKey: true,
      maskedApiKey: maskApiKey(apiKey),
    });
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "streetView", "geometry"],
    });
    mapsPromise = loader.load().catch((error: unknown) => {
      const mappedError = explainGoogleMapsError(error);
      debugMaps("load failure", { code: mappedError.code, message: mappedError.message });
      mapsPromise = null;
      throw mappedError;
    });
  }

  try {
    const maps = await mapsPromise;
    await Promise.all([maps.maps.importLibrary("maps"), maps.maps.importLibrary("streetView"), maps.maps.importLibrary("geometry")]);
    debugMaps("load success", { origin: window.location.origin });
    return maps;
  } catch (error) {
    const mappedError = explainGoogleMapsError(error);
    debugMaps("load failure", { code: mappedError.code, message: mappedError.message });
    throw mappedError;
  }
}

export function humanizeGoogleMapsError(error: unknown): string {
  const mappedError = explainGoogleMapsError(error);
  return `${mappedError.message}\n\nHow to fix: ${mappedError.userFix}`;
}

function isPlaceholderKey(apiKey: string): boolean {
  const normalized = apiKey.toLowerCase();
  return normalized.includes("your_key") || normalized.includes("replace_with") || normalized.includes("your_google") || normalized === "your_api_key";
}

function debugMaps(message: string, details: Record<string, unknown>): void {
  if (import.meta.env.VITE_ENABLE_DEBUG_TOOLS === "true") {
    console.debug(`[GoogleMaps] ${message}`, details);
  }
}
