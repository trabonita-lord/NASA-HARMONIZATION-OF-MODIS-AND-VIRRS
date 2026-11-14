# TANAW — React + Supabase prototype

TANAW (Thermal Activity Network and Analytics Watch) is a research prototype for the 2026 NASA Space Apps Challenge **Harmonization of MODIS and VIIRS Hot Spots**. It includes a React/Vite interface, Leaflet map, UTC activity calendar, sensor filtering, Supabase PostgreSQL schema, and an importer for the original team's six NASA FIRMS CSV files.

## Quick start

1. Install Node.js 20.6+.
2. Open this folder in VS Code. Run `npm install`.
3. Run `npm run dev` and open the local URL. Without Supabase configuration, the application shows **five explicitly labeled sample observations**, not the real CSV dataset.
4. Create a Supabase project. In **SQL Editor**, run `supabase/migrations/001_fire_observations.sql`.
5. Copy `.env.example` to `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon key). Set `SUPABASE_SERVICE_ROLE_KEY` **only for the local importer**.
6. Run `npm run import:data` to import the supplied CSVs. This may take several minutes and requires a network connection. Re-running is idempotent for the same input file and line positions.
7. Restart `npm run dev`. Select November 2026 or another month in the original dataset.
8. Build for deployment with `npm run build`. Deploy `dist/` to Vercel or Netlify and configure only the two `VITE_` environment variables there. **Never** deploy the service-role key.

## GitHub

Commit `src/`, `public/`, `supabase/migrations/`, `scripts/`, `data/catalog.json`, `data/validation.json`, `package.json`, `vite.config.js`, `.env.example`, `.gitignore`, and `README.md`. The included `data/raw/` CSV files can be committed if your team agrees to publish the original data and checks file size/license/attribution. `.env`, `node_modules/`, `dist/`, and SQLite databases are ignored. Avoid committing credentials or large generated artifacts.

## Important scientific limitations

- MODIS and VIIRS are loaded into a common observation schema, **not scientifically calibrated or deduplicated** into unique fire events.
- Daily counts are raw satellite observations; differences in overpass frequency, pixel size, cloud cover, and detection thresholds affect comparisons.
- MODIS confidence (0–100) and VIIRS categorical confidence are not equivalent.
- Map and comparison display the **latest 1,500 observations** matching a month/sensor filter; calendar daily counts use all matching database rows through a SQL aggregation.
- No live NASA FIRMS API, validated fire-event clustering, multi-year baseline, anomaly detection, or operational alerting is implemented.
- This package includes the original project's 2026 CSV files; longer historical analysis requires additional datasets and careful cross-sensor validation.
- Attribution: NASA FIRMS (Fire Information for Resource Management System), source files supplied by the TANAW team.

## Migration note

The original project used plain HTML/CSS/JS and a Node.js/SQLite backend. This is a **new React implementation of the core map/calendar/overview features**, not a one-to-one conversion of all 14 original screens. Original legacy files were not shipped as active app code. Preserve your original ZIP separately for reference.
