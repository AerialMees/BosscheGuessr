import { getApiKey, maskApiKey } from "../lib/googleMapsLoader";
import type { GoogleMapsLoadError } from "../lib/googleMapsErrors";

interface MapsErrorPanelProps {
  error: GoogleMapsLoadError;
}

export function MapsErrorPanel({ error }: MapsErrorPanelProps) {
  const apiKey = getApiKey();
  const hasApiKey = Boolean(apiKey?.trim());

  return (
    <section className="maps-error-panel">
      <h2>Google Maps could not load</h2>
      <dl>
        <div>
          <dt>Detected issue</dt>
          <dd>{error.code}</dd>
        </div>
        <div>
          <dt>What this means</dt>
          <dd>{error.message}</dd>
        </div>
        <div>
          <dt>How to fix it</dt>
          <dd>{error.userFix}</dd>
        </div>
        <div>
          <dt>Current origin</dt>
          <dd>{window.location.origin}</dd>
        </div>
        <div>
          <dt>Expected local referrers</dt>
          <dd>
            <code>http://localhost:5173/*</code>
            <br />
            <code>http://127.0.0.1:5173/*</code>
          </dd>
        </div>
        <div>
          <dt>API key present</dt>
          <dd>{hasApiKey ? "yes" : "no"}</dd>
        </div>
        {hasApiKey && (
          <div>
            <dt>Masked key</dt>
            <dd>{maskApiKey(apiKey)}</dd>
          </div>
        )}
      </dl>

      <h3>Setup checklist</h3>
      <ol>
        <li>Is .env present in the project root?</li>
        <li>Does it contain VITE_GOOGLE_MAPS_API_KEY=...?</li>
        <li>Did you restart npm run dev after editing .env?</li>
        <li>Is Maps JavaScript API enabled?</li>
        <li>Is billing enabled on the Google Cloud project?</li>
        <li>Is the API key restricted to Maps JavaScript API?</li>
        <li>Are HTTP referrers set to localhost?</li>
        <li>Are you opening the app through npm run dev instead of file://?</li>
      </ol>
    </section>
  );
}
