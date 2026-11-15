# Satellite brightness temperatures

## Verified data path

The deployed Supabase `fire_observations` table was inspected read-only,
including one row per sensor. Its thermal columns are `brightness` and
`bright_t31`; it has no `bright_ti4` or `bright_ti5` columns. Both thermal
columns contain non-null values in the inspected MODIS and VIIRS rows.
This spot check does not establish completeness across all observations.

All six CSVs in `data/raw` use `brightness` and `bright_t31`, including
the VIIRS files. `scripts/import-firms.mjs` preserves these Kelvin values
and also accepts VIIRS native names, mapping `bright_ti4` to `brightness`
and `bright_ti5` to `bright_t31`. No schema migration or reimport is needed.

| Sensor | Stored field | Channel / native field |
| --- | --- | --- |
| MODIS | `bright_t31` | 11 µm channel 31 / `bright_t31` |
| MODIS | `brightness` | fire channel / `brightness` |
| VIIRS | `bright_t31` | I5 / `bright_ti5` |
| VIIRS | `brightness` | I4 fire channel / `bright_ti4` |

`src/lib/satellite-temperature.js` explicitly identifies these aliases.
Native fields, if present on an observation, take precedence even when
invalid or null. Readings include the canonical field, actual source field,
original Kelvin input, validated Kelvin, Celsius, label, and measurement type.
Objects from Supabase are never mutated. Demo observations have no invented
thermal measurements.

## Interpretation

Conversion is `Celsius = Kelvin - 273.15`, formatted to two decimal places.
Only finite positive numeric Kelvin values are valid; null, absent, zero,
negative, string, and other invalid inputs display "Not available."
No 0.02 scale factor applies to these FIRMS brightness-temperature fields.

Satellite brightness temperature is a radiometric measurement and does not necessarily represent actual ground surface temperature or flame temperature.

Open-Meteo air temperatures remain separate. Comparison ranges are per channel,
use only valid observations from the fetched sample, and are not matched-pair
differences or equivalent measurements across sensors. Missing values are never
estimated. Any future dedicated MODIS/VIIRS Land Surface Temperature integration
requires product-specific scaling, quality-flag filtering, and separate labels.

NASA field references:

- [MODIS FIRMS attributes](https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_MODIS_Firehotspots.html)
- [VIIRS FIRMS attributes](https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html)

The shared display is used in Fire Map observation popups and the existing daily
observation table. Summary and timeline queries now retrieve the existing thermal
columns. Comparison shows channel ranges and valid reading counts. Calendar,
weather, warning, matching thresholds, and detection algorithms are unchanged.
