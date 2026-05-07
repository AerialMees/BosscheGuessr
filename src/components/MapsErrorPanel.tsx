import { getApiKey, maskApiKey } from "../lib/googleMapsLoader";
import type { GoogleMapsLoadError } from "../lib/googleMapsDiagnostics";

interface MapsErrorPanelProps {
  error: GoogleMapsLoadError;
}

export function MapsErrorPanel({ error }: MapsErrorPanelProps) {
  const apiKey = getApiKey();
  const hasApiKey = Boolean(apiKey?.trim());
  const referrerRules = "http://localhost:5173/*\nhttp://127.0.0.1:5173/*";

  function openReadmeTroubleshooting() {
    window.open("https://github.com/AerialMees/BosscheGuessr#fixing-google-maps-billing--development-watermark", "_blank", "noopener,noreferrer");
  }

  return (
    <section className="maps-error-panel">
      <p className="eyebrow">Maps setup issue</p>
      <h2>Google Maps could not load</h2>
      <p className="maps-error-subtitle">BosscheGuessr needs a valid Maps JavaScript API key with billing enabled.</p>
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

      <div className="maps-error-actions">
        <button type="button" className="mini-action" onClick={() => navigator.clipboard.writeText(window.location.origin)}>
          Copy current origin
        </button>
        <button type="button" className="mini-action" onClick={() => navigator.clipboard.writeText(referrerRules)}>
          Copy localhost referrers
        </button>
        <a className="mini-action" href="#maps-setup-checklist">
          Show setup checklist
        </a>
        <button type="button" className="mini-action" onClick={openReadmeTroubleshooting}>
          Open README troubleshooting
        </button>
      </div>

      <h3>Free trial credit checklist</h3>
      <p>
        Having free trial credit is not enough by itself. The project that owns this key must still have active billing and
        Maps JavaScript API access.
      </p>
      <ol>
        <li>The Google Cloud project that owns this API key has billing attached.</li>
        <li>The billing account is active.</li>
        <li>Maps JavaScript API is enabled on that same project.</li>
        <li>The API key is restricted to Maps JavaScript API, not the wrong API.</li>
        <li>The HTTP referrer restriction includes the exact local origin.</li>
        <li>You restarted Vite after editing .env.</li>
      </ol>

      <h3 id="maps-setup-checklist">Setup checklist</h3>
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
      <p className="maps-error-note">If you are using a different Vite port, add that exact origin too.</p>
    </section>
  );
}
