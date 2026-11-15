import { summarizeHourlyWind } from './historical-wind';


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

const DAILY_FIELDS = ['temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_sum', 'relative_humidity_2m_mean', 'wind_speed_10m_max'];

// UTC days match the Fire Calendar acquisition dates, rather than local days.
export async function fetchDailyHistoricalWeather({ latitude, longitude, date, signal } = {}) {
  if (!validCoordinates(latitude, longitude)) throw new RangeError('Invalid weather coordinates.');
  if (!validDate(date)) throw new RangeError('Invalid historical weather date.');
  if (date < '1940-01-01' || date >= new Date().toISOString().slice(0, 10)) {
    throw new RangeError('Historical weather is unavailable for this date. Choose a completed UTC day from 1940 onward.');
  }
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ latitude, longitude, start_date: date, end_date: date,
    daily: DAILY_FIELDS.join(','), hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m', timezone: 'UTC', temperature_unit: 'celsius',
    precipitation_unit: 'mm', wind_speed_unit: 'kmh' }).toString();
  const key = url.toString();
  if (cache.has(key)) return { ...cache.get(key) };
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo archive request failed (HTTP ${response.status}). The date may not yet be available; try again later.`);
  const payload = await response.json();
  if (payload?.error) throw new Error('Open-Meteo could not provide historical weather for this request.');
  if (!validCoordinates(payload?.latitude, payload?.longitude) || !Array.isArray(payload?.daily?.time)) {
    throw new Error('Invalid Open-Meteo daily weather response.');
  }
  const index = payload.daily.time.indexOf(date);
  const result = { date, provider: PROVIDER };
  for (const field of DAILY_FIELDS) result[field] = index < 0 ? null : optionalNumber(payload.daily[field]?.[index]);
  Object.assign(result, summarizeHourlyWind(payload.hourly, date));
  // Missing/partial results can become available later: do not cache them.
  if (DAILY_FIELDS.every(field => result[field] !== null) && result.wind_speed_hours === 24 &&
      result.wind_direction_hours + result.wind_calm_hours === 24 && result.wind_gust_hours === 24) cache.set(key, result);
  return { ...result };
}
