import { hasGoogleMapsApiKey } from "../lib/googleMapsLoader";
import type { GoogleMapsLoadError } from "../lib/googleMapsDiagnostics";
import { DEBUG_TOOLS_ENABLED } from "../lib/env";

interface MapsSetupStatusProps {
  mapsLoaded: boolean;
  lastError?: GoogleMapsLoadError;
}

export function MapsSetupStatus({ mapsLoaded, lastError }: MapsSetupStatusProps) {
  const showDetails = Boolean(lastError) || DEBUG_TOOLS_ENABLED;
  const isDevServer = window.location.protocol === "http:" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return (
    <section className={`maps-setup-status ${lastError ? "maps-setup-status-error" : "maps-setup-status-ok"}`}>
      <h2>{lastError ? "Maps setup issue" : "Maps ready"}</h2>
      <div className="status-grid">
        <span>API key present</span>
        <strong>{hasGoogleMapsApiKey() ? "yes" : "no"}</strong>
        <span>Current origin</span>
        <strong>{window.location.origin}</strong>
        <span>Vite port</span>
        <strong>{window.location.port || "default"}</strong>
        <span>Dev server</span>
        <strong>{isDevServer ? "likely yes" : "check URL"}</strong>
        <span>Maps loaded</span>
        <strong>{mapsLoaded ? "yes" : "no"}</strong>
      </div>
      {showDetails && (
        <p className={lastError ? "status-error" : undefined}>
          Last Maps error: {lastError ? `${lastError.code}: ${lastError.message}` : "none"}
        </p>
      )}
    </section>
  );
}
