# TANAW full-map workspace

## Changed
- App.jsx now uses one persistent full-screen map below the TANAW header. Switching pages opens a right-hand drawer instead of replacing the map.
- Overview, hotspot map, activity calendar, sensor comparison, and data/methodology remain available from the left navigation.
- Summary cards use a two-column grid inside the drawer. The phone layout uses a scrollable bottom sheet.
- The map defaults to NASA Blue Marble satellite background, with street and dark alternatives. Blue Marble is a static background, not live satellite imagery or the selected month's fire detections.

## Added
- Layers panel: independent MODIS/VIIRS visibility switches. Hiding markers does not change observation counts.
- Latitude/longitude grid with degree labels that adapt to zoom. Use Layers > Overlays or the Lat / Lon toolbar button.
- Live coordinate readout on pointer movement, map taps, and panning.
- Validated latitude/longitude search, map scale, fit-observations button, panel close/reopen controls, and a workspace guide.
- Background loading fallback and visible notices; observation errors have a Retry action.
- Comments identifying the layout, sidebar, filters, summary grid, panel, and map tools.

## Preserved
- Existing data-loading functions and Supabase setup; no backend or new package was added.
- Month arrows, month picker, sensor filter, calendar dates, date popup, pie chart, comparison, source information, welcome popup, owl intro, and count-up animations.
- Existing sample data and chart values. These are demonstration values until connected to the intended backend.

## Where to edit (paths below are relative to the repository)
| File | Purpose |
| --- | --- |
| src/App.jsx | Sidebar buttons, header text, summary cards, page selection, toolbar |
| src/workspace.css | Full-map layout; sizes and header colors at the top; phone rules near the bottom |
| src/app.css | Existing theme palette, date popup, chart styles, other shared styles |
| src/components/LayersPanel.jsx | Layer switches and background choices |
| src/components/FireMap.jsx | Background tile URLs, marker appearance, marker popup |
| src/components/CoordinateGrid.jsx | Coordinate lines and degree labels |
| src/components/CoordinateReadout.jsx | Latitude/longitude display |
| src/components/LocationSearch.jsx | Coordinate inputs and validation message |
| src/components/MapControls.jsx | Automatic map fitting and scale |
| src/lib/map-utils.js | Coordinate validation, bounds, grid spacing, month validation |
| src/components/DatePopup.jsx | Existing date popup and pie chart |

## Checks and limits
- Production compilation passed with the existing Vite React configuration. Vite reported a large-bundle advisory; it did not fail the build.
- Automated behavior checks passed for existing page navigation, one persistent map, sensor/grid switches, background selection, coordinate navigation, calendar date popup, and month controls.
- Calculation checks passed for invalid/empty coordinates, coordinate formatting, bounded grid generation, empty observation bounds, and leap-year month boundaries.
- Brave could not reach the local preview (connection timeout). Visual appearance, live map tile delivery, responsive rendering, and end-to-end backend behavior therefore remain unverified in this session.
- Internet access is required for background maps. Existing backend credentials/data are required for live observations.
- Changes are local. Nothing was pushed or deployed.

## Preview locally
From the existing repository folder run npm.cmd run dev, then open the Local address printed by Vite. The .cmd form works around PowerShell's npm.ps1 script restriction.

## Reference documentation
- NASA GIBS: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- React Leaflet map API: https://react-leaflet.js.org/docs/api-map/
