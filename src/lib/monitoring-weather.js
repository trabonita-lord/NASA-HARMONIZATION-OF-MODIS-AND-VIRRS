import { fetchHistoricalWeather } from './open-meteo-history';
import { compassDirection } from './historical-wind';
import { precipitationSummary, utcDate } from './monitoring-indicators';

const number = (value, min = -Infinity, max = Infinity) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
export function normalizeMonitoringWeather(payload, asOf) {
  const current = payload?.current;
  if (!current || typeof current.time !== 'string') throw new Error('Open-Meteo current weather is missing.');
  const observedAt = Date.parse(`${current.time}Z`);
  if (!Number.isFinite(observedAt)) throw new Error('Open-Meteo current timestamp is invalid.');
  const direction = number(current.wind_direction_10m, 0, 360);
  return { observedAt, temperature_c: number(current.temperature_2m),
    relative_humidity_pct: number(current.relative_humidity_2m, 0, 100),
    wind_speed_kmh: number(current.wind_speed_10m, 0),
    wind_direction_deg: direction, wind_direction_label: compassDirection(direction),
    ...precipitationSummary(payload.daily, asOf), provider: 'Open-Meteo Weather API (current and recent model estimates)' };
}
export async function fetchMonitoringWeather(place, asOf, signal) {
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) throw new Error('Choose a valid saved location.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m',
    daily: 'precipitation_sum', past_days: '14', forecast_days: '1', timezone: 'UTC',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' });
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Open-Meteo current weather failed (HTTP ${response.status}).`);
  const payload = await response.json();
  if (payload?.error) throw new Error('Open-Meteo current weather is unavailable.');
  return normalizeMonitoringWeather(payload, asOf);
}
export function temperatureReferenceRange(asOf) {
  const center = new Date(asOf); center.setUTCFullYear(center.getUTCFullYear() - 1);
  return { startDate: utcDate(center.getTime() - 15 * 86400000), endDate: utcDate(center.getTime() + 15 * 86400000) };
}
export async function fetchTemperatureReference(place, asOf, signal) {
  const range = temperatureReferenceRange(asOf);
  const records = await fetchHistoricalWeather({ latitude: place.latitude, longitude: place.longitude, ...range, signal });
  const hour = new Date(asOf).getUTCHours();
  const daily = new Map();
  for (const record of records) {
    if (new Date(record.observed_at).getUTCHours() === hour && Number.isFinite(record.temperature_c)) daily.set(record.observed_at.slice(0, 10), record.temperature_c);
  }
  return { values: [...daily.values()], ...range };
}
