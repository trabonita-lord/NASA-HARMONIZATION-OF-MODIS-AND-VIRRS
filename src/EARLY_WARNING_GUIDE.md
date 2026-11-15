# TANAW Early Warning panel

Open Warnings in the left sidebar. The existing panel uses a saved location and recent UTC data independently of the monthly dashboard filters.

The panel now connects directly to Open-Meteo current weather and recent precipitation estimates, uses the existing archive client for a local seasonal temperature reference, and retrieves paginated MODIS/VIIRS observations from Supabase near the saved location. It no longer reads the placeholder `fire-weather.json` feed or displays provider risk classes. Demo observations are excluded from monitoring.

See [Early Warning monitoring methodology and verification](../docs/early-warning-monitoring.md) for connections, configurable exploratory criteria, source-coverage requirements, limitations, and manual browser checks.

The 10 km default search radius, 6/24/48-hour recent windows, Saved Locations controls, map actions, and repeated-detection review are retained. Repeated groups use a 1 km fixed anchor over 72 hours, with at least two acquisition windows separated by 30 minutes. They remain review candidates, not verified wildfire incidents.

These indicators support situational awareness and are not official wildfire forecasts or emergency alerts.
