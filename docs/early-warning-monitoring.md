# Early Warning monitoring

The existing Early Warning panel is extended; the Fire Calendar and forecast feed are unchanged.
These indicators support situational awareness and are not official wildfire forecasts or emergency alerts.

## Connections and location

- A saved location is required. The first saved location is explicitly shown in the selector; users can choose another. There are no fallback weather coordinates.
- Current temperature, relative humidity, wind speed and meteorological wind origin come from the Open-Meteo Weather API. Its recent daily precipitation estimates provide the previous completed UTC day's precipitation and a consecutive dry-day count ending yesterday. These are model estimates, not station observations or satellite brightness temperatures.
- Dry-day history is limited to 14 completed UTC days. A wholly dry window is labeled "at least 14"; a missing day makes the run unavailable. Days with precipitation below 1 mm are dry. Today's partial precipitation is excluded.
- The Open-Meteo Historical Weather Archive client is reused for a 31-day reference centered one year before the review date. Only the same UTC hour as the current review is included, at the actual saved coordinates, with at least 20 finite daily samples. This short seasonal reference is not a multi-year climate normal. Archive reanalysis and current estimates can have model differences.
- The existing Supabase `fire_observations` query is paginated with date and spatial bounding-box filters for the preceding 30 days; exact haversine radius filtering follows locally. Default radius is 10 km; users can choose 5/10/25/50 km and recent windows of 6/24/48 hours. Both MODIS and VIIRS are included independently of dashboard filters.
- Missing/invalid acquisition times, forecast rows and future observations are excluded from recency calculations. Invalid local acquisition times also withhold activity classification. Confidence metadata retains its source scale. Counts describe detections, not distinct wildfire incidents. Repeated-detection grouping remains available as review candidates.
- When Supabase is unconfigured, monitoring reports that limitation and excludes the application's demo data.

Provider documentation: https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/historical-weather-api

## Configurable exploratory criteria

Edit `MONITORING_CRITERIA` in `src/lib/monitoring-indicators.js`. Defaults:

| Factor | Criterion |
| --- | --- |
| Local relative heat | Current temperature above the 90th percentile of at least 20 same-hour seasonal reference samples |
| Low humidity | Relative humidity at or below 30% |
| Strong wind | Wind speed at or above 30 km/h |
| Extended dry period | At least 5 consecutive completed UTC days below 1 mm/day |
| Nearby detections | At least one MODIS/VIIRS detection in the selected radius and recent window |
| Unusual activity | At least twice the reference mean and at least 3 observations above it |

Each factor is "Criterion met", "Criterion not met", or "Insufficient data". Any missing factor makes the overall assessment incomplete. No factor count is converted into a fire probability or official risk class. Weather older than 2 hours or more than 5 minutes into the future is excluded from current-factor assessment. Latest satellite acquisitions older than 48 hours are labeled stale; retrieval time is never substituted for acquisition time.

## Activity reference and coverage

The comparison uses nonoverlapping windows equal to the recent window length in the 28 days immediately before the recent window. Boundaries are `(start, end]`. The same area, radius, and combined MODIS/VIIRS source set are used throughout. At least 7 reference windows and a source-complete recent window are required. Counts are classified as higher-than-usual, typical, no detected activity, or insufficient data. "Typical" here means the exploratory excess criterion was not met, not a claim of statistical normality.

Source completeness is checked using the existing `public/data/dashboard-coverage.json` schema and `sourceCovers` utility. Both sensors must have verified complete ingestion for all dates intersecting each window. Empty/unavailable coverage metadata is not treated as complete. The repository currently has an empty manifest, so comparisons correctly remain insufficient until actual ingestion completeness is documented. Do not populate ranges without verifying the source imports. No baseline values are fabricated from missing days.

The 28-day local reference limits seasonal differences; it does not correct for interannual variation, cloud cover, overpasses, sensor changes, or detection sensitivity. Complete ingestion does not guarantee cloud-free satellite coverage. Lack of detections does not establish lack of fire. Wind alone does not validate a fire-spread direction.

## Refresh and failures

The panel refreshes once per minute while mounted and supports manual refresh. Requests cancel when location/radius changes or the panel closes; a 30-second deadline prevents indefinite loading. Current weather, historical reference, source coverage and satellite requests report errors separately. Historical weather uses the existing in-memory archive cache. Old-location results are hidden immediately while the new location loads.

## Manual browser verification

1. Run `npm.cmd run dev`, open TANAW, and use the Location Tool to save a location. Open the existing Early Warning panel. With no saved locations, confirm the explicit empty state and unavailable indicators.
2. Choose the saved location and verify its coordinates in the selector. In Network tools, confirm the Open-Meteo request uses those coordinates, `timezone=UTC`, current weather fields, `past_days=14`, explicit Celsius/km/h/mm units, and daily precipitation. Verify the archive request is a separate prior-year range.
3. Confirm current estimates, previous-day precipitation date, dry-day coverage, last weather estimate, and historical reference dates/sample count are visible. Wind must be labeled as coming from the displayed direction, with no spread prediction.
4. With configured Supabase, inspect the paginated request for date bounds, geographic bounds, acquisition time and confidence fields. Confirm nearby rows show sensor, satellite, source confidence, UTC acquisition time and distance. Compare the nearest distance with the listed detections. Without Supabase, confirm no demo detections enter the monitoring assessment.
5. Switch saved location, radius and recent-time window. Confirm old-location values disappear during loading, counts update, and View on map still works. Confirm repeated-detection review is retained.
6. With the current empty coverage manifest, confirm activity comparison is "Insufficient data" and the mean is withheld, even when actual detections exist. Verify classification arithmetic using the automated fixtures rather than inserting artificial coverage into production.
7. Block current weather, archive, Supabase and coverage requests separately in browser developer tools. Confirm the corresponding error and insufficient-data states while successful sources remain usable. Restore connectivity and Refresh. Check the stale/future handling with test fixtures.
8. At narrow mobile and desktop widths, check card wrapping, selectors, lists and the scientific disclaimer. Reopen Fire Calendar and confirm its weather, observation chart and historical wind analysis still work.

Automated tests cover criteria, missing values, geographic/time filtering, stale/future data, dry-day gaps, source completeness, reference windows, classification boundaries, API normalization, spatial query construction, pagination failure, and rendered empty/error/data states. Automated tests do not establish scientific prediction accuracy or verify a live browser session.
