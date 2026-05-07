export type GoogleMapsIssueCode =
  | "MISSING_API_KEY"
  | "PLACEHOLDER_API_KEY"
  | "INVALID_KEY"
  | "EXPIRED_KEY"
  | "API_NOT_ACTIVATED"
  | "BILLING_NOT_ENABLED"
  | "REFERER_NOT_ALLOWED"
  | "API_TARGET_BLOCKED"
  | "OVER_QUOTA"
  | "PROJECT_DENIED"
  | "LOAD_FAILED"
  | "UNKNOWN";

export class GoogleMapsLoadError extends Error {
  code: GoogleMapsIssueCode;
  userFix: string;
  originalError?: unknown;

  constructor(input: { code: GoogleMapsIssueCode; message: string; userFix: string; originalError?: unknown }) {
    super(input.message);
    this.name = "GoogleMapsLoadError";
    this.code = input.code;
    this.userFix = input.userFix;
    this.originalError = input.originalError;
  }
}

export function explainGoogleMapsError(rawErrorOrMessage: unknown): GoogleMapsLoadError {
  if (rawErrorOrMessage instanceof GoogleMapsLoadError) return rawErrorOrMessage;

  const rawMessage = stringifyError(rawErrorOrMessage);

  if (globalThis.location?.protocol === "file:") {
    return mapsError("LOAD_FAILED", "BosscheGuessr was opened from file://, which will not match the local Google Maps referrer setup.", "Run npm run dev and open http://localhost:5173/ or http://127.0.0.1:5173/.", rawErrorOrMessage);
  }

  if (rawMessage.includes("MissingKeyMapError")) {
    return mapsError("MISSING_API_KEY", "The Maps JavaScript API was loaded without an API key.", "Create .env with VITE_GOOGLE_MAPS_API_KEY=your_real_key, then restart npm run dev.", rawErrorOrMessage);
  }

  if (rawMessage.includes("InvalidKeyMapError")) {
    return mapsError("INVALID_KEY", "The API key is invalid, deleted, or not recognized by Google Maps.", "Create a new API key in the Google Cloud project that has Maps JavaScript API enabled, update .env, then restart Vite.", rawErrorOrMessage);
  }

  if (rawMessage.includes("ExpiredKeyMapError")) {
    return mapsError("EXPIRED_KEY", "The API key is expired or no longer accepted by Google Maps.", "Create a fresh API key, update .env, then restart npm run dev.", rawErrorOrMessage);
  }

  if (rawMessage.includes("BillingNotEnabledMapError")) {
    return mapsError("BILLING_NOT_ENABLED", "Billing is not enabled for the Google Cloud project linked to this API key.", "Free trial credit is not enough by itself. Attach an active billing account to the project that owns this key.", rawErrorOrMessage);
  }

  if (rawMessage.includes("ApiNotActivatedMapError")) {
    return mapsError("API_NOT_ACTIVATED", "Maps JavaScript API is not enabled on the Google Cloud project linked to this key.", "Google Cloud Console > APIs & Services > Library > enable Maps JavaScript API on the same project that owns the key.", rawErrorOrMessage);
  }

  if (rawMessage.includes("RefererNotAllowedMapError")) {
    return mapsError("REFERER_NOT_ALLOWED", "The current local URL is not allowed by the API key's HTTP referrer restrictions.", "Add http://localhost:5173/* and http://127.0.0.1:5173/* to the key's HTTP referrers. If Vite uses another port, add that exact origin too.", rawErrorOrMessage);
  }

  if (rawMessage.includes("ApiTargetBlockedMapError")) {
    return mapsError("API_TARGET_BLOCKED", "The API key exists, but its API restrictions do not allow Maps JavaScript API.", "Google Cloud Console > Credentials > your key > API restrictions > allow Maps JavaScript API.", rawErrorOrMessage);
  }

  if (rawMessage.includes("OverQuotaMapError") || rawMessage.includes("Quota")) {
    return mapsError("OVER_QUOTA", "The project exceeded its Maps JavaScript API quota or has a quota set too low.", "Check Google Cloud Console > APIs & Services > Maps JavaScript API > Quotas. Make sure the quota is not set to 0.", rawErrorOrMessage);
  }

  if (rawMessage.includes("ProjectDeniedMapError") || rawMessage.includes("ApiProjectMapError")) {
    return mapsError("PROJECT_DENIED", "Google denied the project or could not use the project associated with this key.", "Confirm the key belongs to the active Google Cloud project, billing is attached, and Maps JavaScript API is enabled.", rawErrorOrMessage);
  }

  if (rawMessage.toLowerCase().includes("network") || rawMessage.toLowerCase().includes("failed")) {
    return mapsError("LOAD_FAILED", "Google Maps JavaScript API failed to load.", "Check your network, ad blockers, browser console, API key restrictions, and restart Vite after editing .env.", rawErrorOrMessage);
  }

  return mapsError("UNKNOWN", rawMessage || "Google Maps JavaScript API failed with an unknown error.", "Open DevTools > Console and look for a Google Maps error code. Then check billing, Maps JavaScript API activation, API restrictions, HTTP referrers, and quota.", rawErrorOrMessage);
}

function mapsError(code: GoogleMapsIssueCode, message: string, userFix: string, originalError?: unknown): GoogleMapsLoadError {
  return new GoogleMapsLoadError({ code, message, userFix, originalError });
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
