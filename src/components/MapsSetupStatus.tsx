import { hasGoogleMapsApiKey } from "../lib/googleMapsLoader";
import type { GoogleMapsLoadError } from "../lib/googleMapsErrors";

interface MapsSetupStatusProps {
  mapsLoaded: boolean;
  lastError?: GoogleMapsLoadError;
}

export function MapsSetupStatus({ mapsLoaded, lastError }: MapsSetupStatusProps) {
  const showDetails = Boolean(lastError) || import.meta.env.VITE_ENABLE_DEBUG_TOOLS === "true";
  const isDevServer = window.location.protocol === "http:" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return (
    <section className="maps-setup-status">
      <h2>Maps setup status</h2>
      <div className="status-grid">
        <span>API key present</span>
        <strong>{hasGoogleMapsApiKey() ? "yes" : "no"}</strong>
        <span>Current origin</span>
        <strong>{window.location.origin}</strong>
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
