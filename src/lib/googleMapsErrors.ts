export type GoogleMapsLoadErrorCode =
  | "MISSING_API_KEY"
  | "PLACEHOLDER_API_KEY"
  | "LOAD_FAILED"
  | "BILLING_OR_KEY_ERROR"
  | "REFERER_ERROR"
  | "API_NOT_ACTIVATED"
  | "OVER_QUOTA"
  | "UNKNOWN_MAPS_ERROR";

export class GoogleMapsLoadError extends Error {
  code: GoogleMapsLoadErrorCode;
  userFix: string;
  originalError?: unknown;

  constructor(input: { code: GoogleMapsLoadErrorCode; message: string; userFix: string; originalError?: unknown }) {
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

  if (location.protocol === "file:") {
    return new GoogleMapsLoadError({
      code: "LOAD_FAILED",
      message: "The app is being opened from file://, which is not a supported Google Maps JavaScript API referrer for this setup.",
      userFix: "Run npm run dev and open http://localhost:5173/ or http://127.0.0.1:5173/ instead.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["MissingKeyMapError"])) {
    return new GoogleMapsLoadError({
      code: "MISSING_API_KEY",
      message: "The Maps JavaScript API was loaded without an API key.",
      userFix: "Create .env with VITE_GOOGLE_MAPS_API_KEY=your_key_here, then restart npm run dev.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["InvalidKeyMapError", "ExpiredKeyMapError"])) {
    return new GoogleMapsLoadError({
      code: "BILLING_OR_KEY_ERROR",
      message: "The API key is invalid, expired, deleted, or not recognized by Google Maps.",
      userFix: "Create a new API key in the same Google Cloud project and update .env, then restart npm run dev.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["BillingNotEnabledMapError", "ProjectDeniedMapError", "ApiProjectMapError"])) {
    return new GoogleMapsLoadError({
      code: "BILLING_OR_KEY_ERROR",
      message: "Billing or project access is not enabled for the Google Cloud project linked to this API key.",
      userFix: "Open Google Cloud Console > Billing and attach a billing account to the project that owns this key.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["ApiNotActivatedMapError"])) {
    return new GoogleMapsLoadError({
      code: "API_NOT_ACTIVATED",
      message: "Maps JavaScript API is not enabled on the Google Cloud project linked to this key.",
      userFix: "Google Cloud Console > APIs & Services > Library > enable Maps JavaScript API.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["RefererNotAllowedMapError"])) {
    return new GoogleMapsLoadError({
      code: "REFERER_ERROR",
      message: "The current localhost URL is not allowed by the API key's HTTP referrer restrictions.",
      userFix:
        "Google Cloud Console > APIs & Services > Credentials > your API key > Application restrictions > HTTP referrers. Add http://localhost:5173/* and http://127.0.0.1:5173/*.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["ApiTargetBlockedMapError"])) {
    return new GoogleMapsLoadError({
      code: "BILLING_OR_KEY_ERROR",
      message: "The key exists but is not allowed to use Maps JavaScript API.",
      userFix: "Google Cloud Console > Credentials > API restrictions > restrict key to Maps JavaScript API, or add Maps JavaScript API to allowed APIs.",
      originalError: rawErrorOrMessage,
    });
  }

  if (containsAny(rawMessage, ["OverQuotaMapError", "Quota"])) {
    return new GoogleMapsLoadError({
      code: "OVER_QUOTA",
      message: "The project exceeded its Maps JavaScript API quota.",
      userFix: "Check Google Cloud Console > APIs & Services > Maps JavaScript API > Quotas.",
      originalError: rawErrorOrMessage,
    });
  }

  return new GoogleMapsLoadError({
    code: "UNKNOWN_MAPS_ERROR",
    message: rawMessage || "Google Maps JavaScript API failed to load.",
    userFix:
      "Check DevTools > Console for a Google Maps error code. Also verify billing, Maps JavaScript API activation, API key restrictions, localhost referrers, and that Vite was restarted after editing .env.",
    originalError: rawErrorOrMessage,
  });
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
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
