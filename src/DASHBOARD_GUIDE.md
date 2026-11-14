# TANAW Dashboard

Open Dashboard in the left sidebar. The map, map toolbar, and side drawer are removed while this page is displayed. The shared sidebar and Dashboard shortcuts return to the map, calendar, warnings, sensor comparison, and source pages.

## Requested date range
All analytics use January 1-November 14, 2026 only. Monthly charts/table have 11 rows (January-November). November includes days 1-14; December is not added as a zero-count month. Forecast records are excluded.

## Charts and table
- Grouped bar chart: MODIS versus VIIRS counts for each month.
- Time-series line chart: MODIS in the theme's amber and VIIRS in cyan. Dashed lines show each sensor's reference count for the number of displayed days in each month.
- Table: days, both sensor counts, total, reference expected count, count difference, and percentage difference. Click a month to set the summary comparison window.
- Charts/table always cover the full requested range. Date inputs select the summary comparison window within that range.
- All counts are satellite observations, not unique physical fires.

## Reference method
Your requested reference period is January 1-November 14, 2026 (318 UTC days). It is a within-range reference, not a multi-year same-season baseline. Earlier-year history would be required for the latter.

Choose Average daily count or Median daily count. The reference expected count equals the reference daily rate multiplied by the number of comparison days. This handles February and the partial November window without treating every month as equally long.

Count difference = observed count minus reference expected count. Percentage = difference divided by reference expected count times 100. A zero reference makes the percentage undefined (N/A), even when the absolute difference can be calculated. Missing reference values also stay N/A.

The combined median is calculated from daily combined counts; it is not assumed to equal the sum of sensor medians. Comparing the entire reference range with its own mean yields a zero difference by definition.

## Same area
Choose the Philippines map extent or a saved-location radius. Both current counts and the reference use the identical area filter. The extent is the existing map rectangle (latitude 4.58-21.13, longitude 114.27-126.62), not a claim of exact administrative boundaries. Saved circles are clipped to that study extent. Area filtering is local; saved coordinates are not sent to a new external service.

## Data connection and coverage
The Dashboard reuses loadTimelineObservations in src/lib/data.js and its pagination, so the monthly summary's 1,500-row preview does not silently truncate Dashboard counts. Only the requested 2026 range is fetched. No backend tables were changed.

The source-coverage file is public/data/dashboard-coverage.json. It initially contains area_id: philippines-map-extent, source: null, complete_ranges: []. For live data, a complete range entry needs sensor (MODIS or VIIRS), start (YYYY-MM-DD), and end (YYYY-MM-DD). Declare these ranges only after verifying that ingestion for that sensor is complete for the study extent and dates. source can name the feed.

Coverage refers to source ingestion completeness, not guaranteed fire detection or cloud-free satellite observation. Adjacent coverage ranges are joined; gaps remain missing. Both sensors need full reference-period coverage before the combined live reference can be computed.

Until coverage is declared, positive loaded counts may be displayed as partial (dagger symbol); missing counts remain unavailable, and live reference differences are withheld. They are not silently filled with zero.

When Supabase is unconfigured, the existing five sample observations are used. The page prominently labels counts and reference calculations SAMPLE DATA ONLY. Zeros then describe the sample dataset, not real-world fire absence. No observations, earlier-year data, or model predictions were invented.

## Editing guide
- src/components/DashboardPage.jsx: controls, shortcuts, summary cards, comparison and table.
- src/components/DashboardCharts.jsx: Chart.js datasets, colors, bar/line options.
- src/components/dashboard.css: full-page Dashboard layout.
- src/lib/dashboard-statistics.js: range, area, coverage, mean/median, difference calculations.
- src/lib/dashboard-data.js: observation/coverage connection.
- src/hooks/useDashboardData.js: loading, cancellation, timeout, retry.
- src/App.jsx: shared sidebar and Dashboard/map switching.

## Verification
Production compilation and automated checks cover map removal/restoration, navigation, monthly bins, partial November, area matching, mean/median calculations, missing coverage, zero percentages, chart colors/reference lines, invalid date input, cancellation, timeouts, and existing feature regressions. Live source completeness still requires your team's coverage declaration. Browser visual verification was not available in this session. Changes remain local.
