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

## Editing town boundaries

Town zones live in `src/data/zones.ts`.

Each zone has:

- `id`
- `displayName`
- `center`
- `bounds`
- optional `polygon`
- `defaultZoom`
- notes

The MVP currently uses approximate rectangular bounds. Each zone includes this reminder:

```ts
// TODO: Adjust these bounds manually after testing.
```

To tune an area, adjust `north`, `south`, `east`, and `west`, then run the game and test generation. Polygon filtering is already supported by `zoneContainsPoint`, so later you can add a `polygon` array for more accurate town shapes.

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

## Known limitations

- Town boundaries are approximate starter boxes.
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
