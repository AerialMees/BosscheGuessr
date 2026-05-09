# Boundary Data

BosscheGuessr uses local static GPS polygons at runtime. The current playable areas are stored in `src/data/zones.ts` with boundary source metadata.

This folder is reserved for checked-in GeoJSON exports when a zone has a useful OSM/Overpass boundary. Keeping GeoJSON local avoids calling Overpass during gameplay and keeps party mode fast/reliable.

Notes:
- Den Bosch municipal boundaries are too broad for gameplay, so the app uses a tuned urban gameplay polygon.
- Empel and Engelen do not have clean standalone administrative game boundaries in the way a municipality does, so they remain documented gameplay polygons.
- Rosmalen and Kerkdriel are OSM-derived/place-informed and still tuned for fun, local rounds.
