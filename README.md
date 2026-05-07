# BoschGuessr MVP

## What this is

BoschGuessr is a local-first browser game inspired by the fun of location guessing. It uses the official Google Maps JavaScript API and Street View panorama viewer to create a private challenge for friends around Empel, Rosmalen, Engelen, and Kerkdriel.

## What this is not

- Not affiliated with GeoGuessr.
- Not affiliated with Google.
- Not a commercial product.
- Not a scraper, cache, downloader, or storage system for Street View imagery.

Street View is shown only through the official Google Maps JavaScript API, with normal Google attribution.

## Features

- Choose Empel, Rosmalen, Engelen, Kerkdriel, or Mixed Local Mode.
- Play 5-round local guessing games.
- Classic, No Move, and Speedrun mode configuration.
- Random Street View panorama generation inside manually configured town bounds.
- Guessing map with click-to-place marker.
- Distance and score calculation up to 5000 points per round.
- Actual vs guessed map result with line.
- Retro arcade leaderboard saved in `localStorage`.
- Debug tools behind `VITE_ENABLE_DEBUG_TOOLS=true`.

## Setup

```bash
npm install
cp .env.example .env
```

## Google Maps API key setup

1. Create or open a Google Maps Platform project.
2. Enable the Maps JavaScript API.
3. Make sure Street View usage is available for the project. Google may require billing.
4. Restrict the API key for local development, for example to `http://localhost:*`.
5. Put the key in `.env`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Never commit `.env` or API keys. This repo includes `.env.example` only.

## Running locally

```bash
npm run dev
```

Open the localhost URL printed by Vite.

To create a production build:

```bash
npm run build
```

## Editing gameplay boundaries

Town zones live in `src/data/zones.ts`.

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

When `VITE_ENABLE_DEBUG_TOOLS=true`, the guessing map draws the selected gameplay polygon with a visible outline and this note: "Showing gameplay polygon, not official boundary."

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

Manual boundary and color checklist:

1. Start game in Empel.
2. Generate at least 10 Empel rounds.
3. Confirm locations stay inside the intended Empel village game area.
4. Start Rosmalen, Engelen, and Kerkdriel.
5. Confirm locations stay roughly inside their towns.
6. Confirm Street View colors are normal.
7. Confirm guessing map colors are normal.
8. Confirm leaderboard still works.
9. Confirm no `.env` or API key is committed.

## Known limitations

- Town boundaries are approximate gameplay polygons.
- Random generation can fail if a zone has sparse Street View coverage or bounds are too tight.
- Speedrun timer config exists, but the visible timer is not implemented yet.
- No Move mode disables click-to-go and links controls, but Google UI behavior can vary.
- No multiplayer or shareable challenge seed yet.

## Future ideas

- Multiplayer hot-seat mode.
- Shareable challenge seed.
- Daily local challenge.
- Custom town editor.
- Manual seed curation.
- Only bike paths.
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
