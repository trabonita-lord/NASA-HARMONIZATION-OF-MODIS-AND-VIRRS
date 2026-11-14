# Map timeline editing and data connection

Open Timeline from the bottom map toolbar. The drawer closes to make room; closing Timeline restores the existing monthly map.

## Date range
- Historical selection: January 1 through November 14, 2026.
- Forecast selection: November 15 through November 21, 2026.
- All dates use UTC. Date arrows and the slider stop at the limits.
- A 1-, 3-, or 7-day map window ends on the selected day. A window can contain both historical observations and forecasts, drawn separately.
- Playback advances one day after each load completes. Pause, manual selection, errors, closing the timeline, and reaching the end stop playback. Dates without records remain empty; they do not imply no real fires occurred.

## Files to edit
| File | Edit here |
| --- | --- |
| src/components/MapTimeline.jsx | Timeline controls, month shortcuts, labels, playback |
| src/components/map-timeline.css | Timeline design, colors, size, phone layout |
| src/lib/timeline-utils.js | Start, historical cutoff, forecast end, UTC date calculations |
| src/hooks/useMapTimeline.js | Map request lifecycle, cache, timeouts, historical/forecast split |
| src/lib/data.js | loadTimelineObservations: existing Supabase table, paginated; existing sample data when unconfigured |
| src/lib/forecast-data.js | loadForecastData: replace with your prediction API; validate its returned data |
| public/data/fire-forecast.json | Empty forecast file ready for your team's data |
| src/components/FireMap.jsx | Forecast marker appearance and popup |

## Forecast format
The shipped file has model: null, issued_at: null, and predictions: []. The timeline clearly reports that forecasts are not connected. No predicted locations are generated or invented.

Replace that file, or return this shape from your API:

```json
{
  "model": "YOUR_MODEL_NAME",
  "issued_at": "2026-11-14T00:00:00Z",
  "predictions": []
}
```

Each prediction should provide id, date (YYYY-MM-DD), latitude, longitude, and optionally probability (number 0 through 1), and sensor (MODIS or VIIRS). Add only genuine outputs from your model. Forecast dates must be later than November 14. Entries beyond November 21 are outside this timeline. Invalid entries or duplicate IDs produce a visible data error rather than misleading map markers.

Forecasts use dashed purple rings and a popup labeled Predicted hotspot, with model, issue time, and optional model probability. Predictions without a source sensor remain visible independently of MODIS/VIIRS visibility; sensor-specific forecasts follow the matching sensor switch.

## Historical connection
The timeline reuses the existing fire_observations table when Supabase is configured. It pages through all rows for the selected window rather than silently stopping at the dashboard's 1,500-row preview. The existing monthly cards and calendar keep their current loading behavior.

When Supabase is not configured, only the five existing sample records are available (November 4-8). The timeline labels this Sample history. It does not populate missing dates with fabricated observations or copy additional source datasets.

## Verification
Production compilation and automated date, data-loading, playback, cancellation, pagination, marker, and regression checks are run before delivery. Live model output and a production backend still require your team's data connection.
