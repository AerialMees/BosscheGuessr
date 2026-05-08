# BoschGuessr MVP

## What this is

BoschGuessr is a local-first browser game inspired by the fun of location guessing. It uses the official Google Maps JavaScript API and Street View panorama viewer to create a private challenge for friends around Empel, Rosmalen, Engelen, Kerkdriel, and Den Bosch.

## What this is not

- Not affiliated with GeoGuessr.
- Not affiliated with Google.
- Not a commercial product.
- Not a scraper, cache, downloader, or storage system for Street View imagery.

Street View is shown only through the official Google Maps JavaScript API, with normal Google attribution.

## Features

- Choose Empel, Rosmalen, Engelen, Kerkdriel, Den Bosch, or Mixed Local Mode.
- Play 5-round local guessing games.
- Classic, No Move, and X-Second View modes.
- Random Street View panorama generation inside manually configured town bounds.
- Guessing map with click-to-place marker.
- Distance and score calculation up to 5000 points per round.
- Actual vs guessed map result with line.
- Retro arcade leaderboard saved in `localStorage`.
- Tasteful local Web Audio arcade sounds with a toggle and volume control.
- LAN multiplayer lobbies for same-Wi-Fi party games.
- Shared multiplayer rounds, editable round counts, timers, player status, and competition leaderboards.
- Debug tools behind `VITE_ENABLE_DEBUG_TOOLS=true`.

## Setup

```bash
npm install
cp .env.example .env
npm run check:env
```

## Google Maps API key setup

1. Create or open a Google Maps Platform project.
2. Enable the Maps JavaScript API.
3. Make sure Street View usage is available for the project. Google may require billing.
4. Restrict the API key for local development, for example to `http://localhost:*`.
5. Put the key in `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_real_key
```

Never commit `.env` or API keys. This repo includes `.env.example` only.

`npm run check:env` verifies that Vite can see the key without printing the full secret. If it reports a masked key like `repl..._key`, the `.env` file still contains the placeholder and needs a real Google Maps JavaScript API key.

For LAN multiplayer, friends load the app through your Mac's local IP instead of `localhost`. If Maps works on the host Mac but fails on phones, add the exact LAN referrer shown by the lobby, for example:

```text
http://192.168.1.42:5173/*
```

If Vite picks a different port, add that exact port too. Do not leave an unrestricted key around permanently; only loosen restrictions temporarily while diagnosing.

## Fixing: This page can't load Google Maps correctly

That Google overlay usually means the Maps JavaScript API loaded but Google rejected the key, project, billing state, quota, or current URL. The app now shows a local diagnostics panel with the detected issue, current origin, expected localhost referrers, and a checklist.

## Fixing Google Maps billing / development watermark

If you see any of these:

- "This page can't load Google Maps correctly"
- "For development purposes only"
- darkened maps
- negative or inverted Street View
- Street View going black after briefly loading

Do not hide the watermark or Google attribution with CSS. It usually means Google is rejecting the Maps JavaScript API request or the Street View renderer is being visually broken by CSS/layout. Check the browser console first for the exact error code.

1. Same project check
   The API key must belong to the same Google Cloud project where Maps JavaScript API is enabled.

2. Billing account check
   Google Cloud free trial credit is not enough unless the project is actually linked to an active billing account.

3. API enabled check
   Enable Maps JavaScript API.

4. API restrictions check
   The key must be allowed to use Maps JavaScript API.

5. HTTP referrer check
   For local Vite, add:

```text
http://localhost:5173/*
http://127.0.0.1:5173/*
```

If Vite uses another port, add that port too.

6. `.env` check

```bash
VITE_GOOGLE_MAPS_API_KEY=your_real_key
```

7. Restart Vite

```bash
npm run dev
```

8. Try temporarily removing restrictions
   For testing only, temporarily set API key application restrictions to "None" and API restrictions to unrestricted, then reload the app. If it works, the issue is restrictions/referrer. Re-enable restrictions correctly afterward.

9. Check quota
   Make sure Maps JavaScript API quota is not set to 0.

10. Do not use `file://`
    Always run through `npm run dev`.

### A. Check browser console

Open DevTools > Console and look for the exact Google Maps error code:

- `BillingNotEnabledMapError`
- `ApiNotActivatedMapError`
- `RefererNotAllowedMapError`
- `MissingKeyMapError`
- `InvalidKeyMapError`
- `ExpiredKeyMapError`
- `ApiTargetBlockedMapError`
- `OverQuotaMapError`

### B. Correct Google Cloud setup

1. Enable Maps JavaScript API.
2. Enable billing for the project that owns the key.
3. Create an API key.
4. Restrict the application by HTTP referrers:

```text
http://localhost:5173/*
http://127.0.0.1:5173/*
```

5. Restrict the API key to Maps JavaScript API.

### C. Correct local .env

In the project root, create `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_real_key
VITE_ENABLE_DEBUG_TOOLS=false
```

Use `VITE_GOOGLE_MAPS_API_KEY`, not `GOOGLE_MAPS_API_KEY`. Vite only exposes variables prefixed with `VITE_`.

### D. Restart Vite

After changing `.env`, stop the dev server and run:

```bash
npm run dev
```

### E. Do not open index.html directly

Use:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173/
```

### F. If still broken

Temporarily remove API key restrictions to test. If it works, the issue is probably an HTTP referrer or API restriction mismatch. Re-add safe restrictions after confirming the key and project are otherwise valid.

## Running locally

Recommended one-command launch:

```bash
npm run launch
```

This checks `.env`, prints the local and LAN URLs, starts the Vite client, and starts the multiplayer server. On macOS you can also double-click `Launch BosscheGuessr.command`.

If you want the raw developer scripts instead:

```bash
npm run dev
```

This starts both:

- Vite client on `0.0.0.0:5173`
- BosscheGuessr multiplayer server on `0.0.0.0:3001`

Open the localhost URL printed by Vite on the host Mac.

## Hosting a LAN multiplayer game from your Mac

1. Connect the Mac and all players' phones/laptops to the same Wi-Fi.
2. Install dependencies:

```bash
npm install
```

3. Create `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_ENABLE_DEBUG_TOOLS=false
```

4. Run:

```bash
npm run dev
```

5. Open the local Vite URL on the Mac.
6. Click **Host Multiplayer**.
7. Copy the LAN join link, for example `http://192.168.x.x:5173/?lobby=ABCD`.
8. Friends open that link on the same Wi-Fi, enter a name, and join the lobby.

The lobby also calls `/api/network-info` on the local server to show available LAN URLs. If multiple network adapters are active, it may show more than one address.

Same Mac joining:

```text
http://localhost:5173/?lobby=ABCD
```

Phone/laptop joining:

```text
http://192.168.x.x:5173/?lobby=ABCD
```

If it does not load:

- Confirm everyone is on the same Wi-Fi.
- Allow Node, Terminal, or the dev server through the macOS firewall if prompted.
- Confirm Vite is running with `--host 0.0.0.0` through `npm run dev`.
- Add the LAN IP referrer to the Google Maps API key restrictions.
- If the Vite port changes, update the Google referrer too.

Finding your Mac's IP manually:

- System Settings > Wi-Fi > Details.
- Or terminal:

```bash
ipconfig getifaddr en0
```

## Multiplayer architecture

BosscheGuessr now runs as a Vite React client plus a small Express/Socket.IO server. Lobbies live in memory and are meant for local party sessions, not public internet hosting.

The server manages:

- lobby codes and player connection state
- host-only settings edits
- authoritative scoring and leaderboard sorting
- round timers and round progression

The host browser generates Street View rounds with the existing Google `StreetViewService`, then sends only the prepared round metadata to the server. During an active round, normal clients receive the shared `panoId`, zone, and initial POV, but not the actual location. Actual locations are revealed only on results.

Available multiplayer settings:

- map: Den Bosch, Engelen, Empel, Rosmalen, Kerkdriel, or Mixed
- mode: the currently available BosscheGuessr modes
- rounds: 1-20
- optional round timer
- X-Second View time when that mode is selected
- movement allowed toggle where the selected mode supports it

To create a production build:

```bash
npm run build
```

## Editing gameplay boundaries

Town zones live in `src/data/zones.ts`.

Available maps:

- Engelen
- Empel
- Rosmalen
- Kerkdriel
- Den Bosch

Each zone has:

- `id`
- `displayName`
- `center`
- `polygon`
- computed `bounds`
- `defaultZoom`
- notes

The boundaries are approximate gameplay polygons, not official cadastral, municipal, or Google boundaries. Each polygon is an editable list of WGS84 `{ lat, lng }` coordinates:

```ts
polygon: [
  { lat: 51.7357, lng: 5.3178 },
  { lat: 51.7361, lng: 5.3269 },
]
```

Bounds are computed from the polygon with `getBoundsForPolygon`, then used for random candidate generation and debug fitting. To tune an area, move polygon vertices in `src/data/zones.ts`, run the game, and test generation.

Empel intentionally uses a tighter polygon than the first MVP so it stays around the built-up village. `src/data/zones.ts` also exports `empelCorePolygon` and a hidden `empel-core` testing zone if you want an even stricter test area later.

Den Bosch uses a broader urban gameplay polygon and has a wider scoring scale than the smaller village maps.

When `VITE_ENABLE_DEBUG_TOOLS=true`, the guessing map draws the selected gameplay polygon with a visible outline and this note: "Showing gameplay polygon, not official boundary."

## Available modes

- Classic Local: five relaxed rounds with movement allowed.
- No Move Mode: movement limited, with pan and zoom still available.
- X-Second View: choose 0.1-60 seconds to inspect Street View, then the panorama is covered with a translucent memory overlay and you guess from memory.

## Sound effects

Sound effects are generated locally with the Web Audio API. There are no external audio assets and no copyrighted sound files. Sounds start only after user interaction, can be toggled from the home screen, and use a localStorage volume setting.

## Troubleshooting inverted Street View colors

Google Maps and Street View containers must not have CSS `filter`, `mix-blend-mode`, opacity tricks, or inverted CRT effects applied to them or their parents. Retro styling should stay on HUDs, panels, buttons, and leaderboard UI.

The app includes a defensive CSS reset for `.street-view-container`, `.guess-map-container`, and `.gm-style` descendants:

```css
filter: none !important;
mix-blend-mode: normal !important;
```

If Street View colors are still inverted after this, check browser dark-mode extensions, forced color settings, or experimental browser flags.

## Leaderboard

Scores are saved locally in the browser with `localStorage`. The leaderboard sorts by highest total score, then lower total distance when scores tie.

The final screen and home preview use the same storage helper in `src/lib/leaderboard.ts`.

## Development notes

- `src/lib/googleMapsLoader.ts` loads the Maps JavaScript API once with `@googlemaps/js-api-loader`.
- `src/lib/streetView.ts` uses `StreetViewService.getPanorama` and requests outdoor Street View where supported.
- `src/lib/geo.ts` contains bounds, polygon, random point, and distance helpers.
- `src/lib/scoring.ts` contains scoring and rating text.
- `src/components/GuessMap.tsx` owns the guess/result map markers and line.
- `src/components/GameScreen.tsx` owns the `StreetViewPanorama` instance.

Debug mode:

```bash
VITE_ENABLE_DEBUG_TOOLS=true
```

This shows pano id, actual lat/lng, current zone, copy JSON, and a test generation button.

Debug tools are hidden by default. Set `VITE_ENABLE_DEBUG_TOOLS=true` in `.env` and restart Vite to show diagnostics, polygon overlays, pano IDs, and seed rejection logs.

Manual boundary and color checklist:

1. Start game in Empel.
2. Generate at least 10 Empel rounds.
3. Confirm locations stay inside the intended Empel village game area.
4. Start Rosmalen, Engelen, Kerkdriel, and Den Bosch.
5. Confirm locations stay roughly inside their towns.
6. Confirm Street View colors are normal.
7. Confirm guessing map colors are normal.
8. Confirm X-Second View covers Street View after the chosen time and guessing still works.
9. Confirm sound toggle and volume work after user interaction.
10. Confirm leaderboard still works.
11. Confirm no `.env` or API key is committed.

## Known limitations

- Town boundaries are approximate gameplay polygons.
- Random generation can fail if a zone has sparse Street View coverage or bounds are too tight.
- No Move mode disables click-to-go and links controls, but Google UI behavior can vary.
- Multiplayer lobbies are in-memory LAN sessions. Restarting the server clears them.
- The host is trusted to prepare rounds in this private MVP.
- No shareable challenge seed yet.

## Future ideas

- Multiplayer hot-seat mode.
- Public internet hosting mode.
- Shareable challenge seed.
- Daily local challenge.
- Custom town editor.
- Manual seed curation.
- Only near water/dikes.
- Den Bosch full-region mode.
- Difficulty based on road type.
- Map blur or hide labels mode.
- Dutch language mode.
- Sound effects.
- CRT shader.
- CSV leaderboard export.
- Friends tournament mode.
- Custom map packs like Maas villages, Den Bosch suburbs, commute challenges, and dike roads only.

## GitHub

Repository target:

```bash
https://github.com/AerialMees/BosscheGuessr.git
```

Initial push commands:

```bash
git init
git branch -M main
git remote add origin https://github.com/AerialMees/BosscheGuessr.git
git add .
git commit -m "Initial BosscheGuessr MVP"
git push -u origin main
```
