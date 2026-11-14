# Open-Meteo map wind directions

Enable Layers > Overlays > Wind directions. The layer starts off. It shows a staggered 5-by-7 pattern (up to 35 points) of sampled current model winds inside the visible Philippines map extent. Click an arrow for speed, source direction, flow direction, and UTC model time.

## Direction convention
Open-Meteo's wind direction follows the meteorological FROM bearing. The displayed arrow points downwind: (FROM + 180) modulo 360. A north wind therefore points south; an east wind points west. Zero-speed values use a calm dot, never a fabricated north arrow. Missing readings are omitted, and the status shows the valid sample count.

## Time and interpretation
- Data are current 10-metre model wind estimates, not direct station measurements and not a fire-spread forecast.
- Each popup shows its model-valid time. The status reports the oldest sampled time.
- The layer pauses during Timeline mode, so current conditions are never passed off as historical or future timeline weather.
- Requests are debounced after pan/resize, cached for up to 10 minutes, and refreshed every 10 minutes only while the layer is active. The Refresh button bypasses the cache.
- Switching off, opening Dashboard, or entering Timeline cancels pending work. Failed/slow requests clear arrows and show a notice rather than fake weather.

## Your API key
The public non-commercial Open-Meteo endpoint does not require a key. No key has been added to the project.

For a paid/customer key, your team can supply a backend proxy:
1. Store OPEN_METEO_API_KEY on your server. This is a server-only placeholder in .env.example, not a frontend credential connection.
2. Have your /api/wind route forward the query to https://customer-api.open-meteo.com/v1/forecast and append the key server-side. Return the unchanged Open-Meteo JSON response.
3. Set VITE_OPEN_METEO_WIND_URL=/api/wind in the app environment and restart Vite/rebuild. A full HTTPS proxy URL also works.

No proxy/backend was created in this change. A private customer key should not be placed in VITE_ settings, because those settings become browser code.

## Expected request/response
The adapter sends comma-separated latitude/longitude values, current=wind_speed_10m,wind_direction_10m, wind_speed_unit=kmh, timezone=GMT, and timeformat=unixtime. Multi-location output must be an array in request order. Each entry supplies current.time, current.wind_speed_10m, current.wind_direction_10m, and current_units.wind_speed_10m=km/h.

## Files
- src/components/WindLayer.jsx: map arrows, status, debouncing, request cleanup.
- src/components/wind-layer.css: arrow appearance and glass status panel.
- src/lib/wind-data.js: sampling, bearing conversion, endpoint URL, response validation, cache.
- src/components/LayersPanel.jsx: the wind-layer checkbox.
- src/App.jsx: default wind=false.
- .env.example: endpoint/proxy placeholders.

## Official references
- Open-Meteo documentation: https://open-meteo.com/en/docs
- Open-Meteo customer endpoint/key information: https://open-meteo.com/en/pricing
- NOAA wind-direction convention: https://forecast.weather.gov/glossary.php?word=WIND+DIRECTION
