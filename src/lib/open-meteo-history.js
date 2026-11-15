
/**
 * TANAW — Open-Meteo Historical Weather Client
 *
 * Fetches hourly historical weather estimates for a
 * selected location and date range.
 *
 * Output is compatible with historical-fire-weather.js.
 *
 * Data source: Open-Meteo Historical Weather API
 * https://open-meteo.com/en/docs/historical-weather-api
 *
 * IMPORTANT:
 * Historical weather values may be modeled/reanalysis
 * estimates rather than direct station measurements.
 */

const API_URL = 'https://archive-api.open-meteo.com/v1/archive';

const HOURLY_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'wind_direction_10m',
];

const PROVIDER = 'Open-Meteo Historical Weather API';

const cache = new Map();

function validCoordinates(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validDate(date) {
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }

  const timestamp = Date.parse(`${date}T00:00:00Z`);

  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === date
  );
}

function optionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

/**
 * Convert Open-Meteo hourly arrays into individual
 * timestamped weather records.
 */
export function normalizeOpenMeteoHistory(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Open-Meteo response.');
  }

  const latitude = payload.latitude;
  const longitude = payload.longitude;

  if (!validCoordinates(latitude, longitude)) {
    throw new Error('Open-Meteo returned invalid coordinates.');
  }

  const hourly = payload.hourly;

  if (!hourly || !Array.isArray(hourly.time)) {
    throw new Error('Open-Meteo response has no hourly timestamps.');
  }

  for (const variable of HOURLY_VARIABLES) {
    if (
      !Array.isArray(hourly[variable]) ||
      hourly[variable].length !== hourly.time.length
    ) {
      throw new Error(
        `Open-Meteo hourly field "${variable}" is missing or incomplete.`
      );
    }
  }

  const records = [];

  for (let index = 0; index < hourly.time.length; index++) {
    const time = hourly.time[index];

    if (
      typeof time !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)
    ) {
      throw new Error(
        `Invalid Open-Meteo timestamp at index ${index}.`
      );
    }

    const timestamp = Date.parse(`${time}:00Z`);

    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 16) !== time
    ) {
      throw new Error(
        `Invalid calendar timestamp at index ${index}.`
      );
    }

    records.push({
      latitude,
      longitude,
      observed_at: new Date(timestamp).toISOString(),
      temperature_c: optionalNumber(
        hourly.temperature_2m[index]
      ),
      relative_humidity_pct: optionalNumber(
        hourly.relative_humidity_2m[index]
      ),
      wind_speed_kmh: optionalNumber(
        hourly.wind_speed_10m[index]
      ),
      wind_direction_deg: optionalNumber(
        hourly.wind_direction_10m[index]
      ),
      provider: PROVIDER,
    });
  }

  return records;
}

/**
 * Fetch historical weather for a selected location
 * and UTC date range.
 *
 * Example:
 *
 * await fetchHistoricalWeather({
 *   latitude: 13.62,
 *   longitude: 123.19,
 *   startDate: '2026-03-10',
 *   endDate: '2026-03-10',
 * });
 */
export async function fetchHistoricalWeather({
  latitude,
  longitude,
  startDate,
  endDate,
  signal,
} = {}) {
  if (!validCoordinates(latitude, longitude)) {
    throw new RangeError('Invalid weather coordinates.');
  }

  if (
    !validDate(startDate) ||
    !validDate(endDate) ||
    startDate > endDate
  ) {
    throw new RangeError('Invalid historical weather date range.');
  }

  const url = new URL(API_URL);

  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', HOURLY_VARIABLES.join(','));
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');

  const cacheKey = url.toString();

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey).map(record => ({ ...record }));
  }

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo historical weather request failed: HTTP ${response.status}`
    );
  }

  const payload = await response.json();

  const records = normalizeOpenMeteoHistory(payload);

  // Cache completed, successfully validated responses only.
  cache.set(cacheKey, records);

  return records.map(record => ({ ...record }));
}

/**
 * Clear the in-memory weather cache.
 * Useful for tests and manual refreshes.
 */
export function clearHistoricalWeatherCache() {
  cache.clear();
}
