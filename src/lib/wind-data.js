// OPEN-METEO WIND CONNECTION. Set VITE_OPEN_METEO_WIND_URL to your backend proxy if needed.
// The public endpoint needs no API key. Paid credentials belong on the proxy server.
import { PHILIPPINES_BOUNDS } from './map-backgrounds';
export const PUBLIC_WIND_URL = 'https://api.open-meteo.com/v1/forecast';
export const WIND_CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
export function clearWindCache() { cache.clear(); }

export function windGrid(bounds) {
  const south = Math.max(PHILIPPINES_BOUNDS[0][0], bounds.south);
  const north = Math.min(PHILIPPINES_BOUNDS[1][0], bounds.north);
  const west = Math.max(PHILIPPINES_BOUNDS[0][1], bounds.west);
  const east = Math.min(PHILIPPINES_BOUNDS[1][1], bounds.east);
  if (![south, north, west, east].every(Number.isFinite) || south >= north || west >= east) return [];
  const points = [];
  // Deterministic offsets spread 35 real sample points across the view, without random jumps.
  const rows = 5;
  const columns = 7;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const verticalOffset = 0.25 + ((row * 7 + column * 3) % 5) * 0.1;
    const horizontalOffset = 0.25 + ((row * 3 + column * 2) % 5) * 0.1;
    const latitude = Number((south + (north - south) * (row + verticalOffset) / rows).toFixed(4));
    const longitude = Number((west + (east - west) * (column + horizontalOffset) / columns).toFixed(4));
    if (!points.some(point => point.latitude === latitude && point.longitude === longitude)) points.push({ latitude, longitude });
  }
  return points;
}

export function downwindBearing(fromDegrees) { return (fromDegrees + 180) % 360; }
export function windCompass(degrees) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8]; }

export function windRequestUrl(points, endpoint = PUBLIC_WIND_URL, origin = 'http://localhost') {
  const url = new URL(endpoint, origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Wind endpoint must use HTTP or HTTPS.');
  url.searchParams.set('latitude', points.map(point => point.latitude).join(','));
  url.searchParams.set('longitude', points.map(point => point.longitude).join(','));
  url.searchParams.set('current', 'wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'GMT');
  url.searchParams.set('timeformat', 'unixtime');
  return url.toString();
}

export function normalizeWindResponse(data, requested) {
  const entries = Array.isArray(data) ? data : [data];
  if (entries.length !== requested.length) throw new Error('Wind service returned an incomplete location response.');
  const points = [];
  entries.forEach((entry, index) => {
    if (!entry || entry.error || !entry.current) return;
    if (entry.current_units?.wind_speed_10m !== 'km/h') throw new Error('Wind service returned unexpected speed units.');
    const speed = entry.current.wind_speed_10m;
    const direction = entry.current.wind_direction_10m;
    const time = entry.current.time;
    if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0 || typeof time !== 'number' || !Number.isFinite(time) || time <= 0 || !Number.isFinite(new Date(time * 1000).getTime())) return;
    if (speed > 0 && (typeof direction !== 'number' || !Number.isFinite(direction) || direction < 0 || direction > 360)) return;
    const from = speed === 0 ? null : direction % 360;
    points.push({ ...requested[index], speed, from, flow: from == null ? null : downwindBearing(from), validAt: time * 1000 });
  });
  if (!points.length) throw new Error('Wind directions are unavailable for this view.');
  return { points, requestedCount: requested.length, oldestTime: Math.min(...points.map(point => point.validAt)) };
}

export async function loadWind(points, signal, refresh = false) {
  const endpoint = import.meta.env.VITE_OPEN_METEO_WIND_URL || PUBLIC_WIND_URL;
  const url = windRequestUrl(points, endpoint, window.location.origin);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const stored = cache.get(url);
  if (!refresh && stored && Date.now() >= stored.loadedAt && Date.now() - stored.loadedAt < WIND_CACHE_MS) return stored.data;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Open-Meteo wind request failed. Check the connection or endpoint setting.');
  const data = normalizeWindResponse(await response.json(), points);
  if (cache.size >= 12) cache.delete(cache.keys().next().value);
  cache.set(url, { loadedAt: Date.now(), data });
  return data;
}
