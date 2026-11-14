# TANAW Early Warning page

Open Warnings in the left sidebar. It is a separate page containing only the requested fire-weather, nearby-hotspot, and repeated-detection sections. Monthly dashboard controls are hidden on this page because its time window is recent UTC data.

## Weather data connection
- Edit src/lib/fire-weather.js to connect your weather API, or replace public/data/fire-weather.json.
- The shipped file contains provider: null, updated_at: null, readings: []. No weather, dry-day counts, or risk assessments are invented.
- The page shows temperature (Celsius), relative humidity (%), wind speed (km/h), and consecutive dry days.
- Risk levels and factor flags must come from your connected provider, using locally validated definitions. The UI does not assume universal warning thresholds.

Return this structure from your API:

```json
{
  "provider": "YOUR_WEATHER_PROVIDER",
  "updated_at": "2026-11-15T00:00:00Z",
  "readings": []
}
```

Each reading requires location_key and observed_at (or use the root updated_at). location_key must match a saved location's latitude and longitude rounded to five decimals, separated by a comma.

Optional readings: temperature_c, relative_humidity_pct, wind_speed_kmh, dry_days, risk_level, signals. Missing readings stay blank. Humidity must be 0-100, wind nonnegative, and dry_days a nonnegative integer. Risk levels: low, moderate, high, very_high, extreme, or null.

The signals object accepts true/false/null for high_temperature, low_humidity, strong_winds, prolonged_dryness. Flags are displayed as provider assessments. Future-dated readings more than five minutes ahead of the page clock are withheld for timestamp review. Reading times always appear with the displayed conditions.

## Nearby hotspots
- Select a saved location, radius (5/10/25/50 km), and recent window (6/24/48 hours). Default: 10 km and 24 hours. These are search settings, not official alert thresholds.
- Distance uses a great-circle calculation. Lists include observation time and a View on map action.
- Only timestamped observations within the selected recent window are counted. Forecasts, future timestamps, invalid coordinates, and missing acquisition times are excluded.
- The view lists the 8 most recent matches and clearly states if more matches exist.

## Repeated detections
- Review uses the same saved-location radius over the last 72 hours.
- Observations are grouped within 1 km of a fixed first-observation anchor. Anchors prevent unrelated areas from being joined through a long chain of nearby points.
- A group needs at least two acquisition windows separated by 30 minutes. Detections/duplicate rows at the same time do not create extra windows.
- These are approximate temporal/spatial candidates, not a verified satellite-pass identifier or evidence of a shared physical fire.
- The view lists the 5 most recently observed groups and states if more groups exist.
- Edit REPEAT_WINDOW_HOURS, REPEAT_DISTANCE_KM, and MIN_REPEAT_GAP_MINUTES in src/lib/early-warning.js to change review rules.

## Data and behavior
- Observations reuse loadTimelineObservations in src/lib/data.js, including pagination. No backend tables or existing observations were changed.
- Saved locations reuse the Location Tool's local browser storage. Manage saved locations opens that tool; selections remain local.
- Data refreshes every minute while this page is open. Closing the page cancels its requests and timers.
- Weather and observation failures are handled independently. A failed service does not erase successfully loaded data from the other service.
- Existing sample records are not current enough to produce live nearby detections on November 15, 2026. Sample mode is labeled. Zero or unavailable data is never shown as an all-clear.

## Editing files
- src/components/EarlyWarningPage.jsx: the three sections and controls.
- src/components/early-warning.css: page appearance.
- src/hooks/useEarlyWarningData.js: request lifecycle, timeout, independent service handling.
- src/lib/early-warning.js: UTC acquisition times, distances, and repeated groups.
- src/lib/fire-weather.js: weather validation and connection.
- src/App.jsx: Warnings sidebar button and map/location actions.
