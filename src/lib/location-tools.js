// Location Tool helpers. Saved places stay in this browser; no backend is added.
import { PHILIPPINES_BOUNDS } from './map-backgrounds';

export const SAVED_LOCATIONS_KEY = 'tanaw.savedLocations.v1';
export const GEOCODER_URL = 'https://nominatim.openstreetmap.org';
const lookupCache = new Map();
let nextLookupTime = 0;

export function isMapLocation(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= PHILIPPINES_BOUNDS[0][0] && latitude <= PHILIPPINES_BOUNDS[1][0] &&
    longitude >= PHILIPPINES_BOUNDS[0][1] && longitude <= PHILIPPINES_BOUNDS[1][1];
}

export function locationKey(latitude, longitude) {
  return latitude.toFixed(5) + ',' + longitude.toFixed(5);
}

export function createLocation(latitude, longitude, details = {}) {
  return {
    key: locationKey(latitude, longitude), latitude, longitude,
    title: typeof details.title === 'string' ? details.title : 'Selected location',
    address: typeof details.address === 'string' ? details.address : '',
  };
}

export function parseCoordinateQuery(query) {
  const match = query.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

export function readSavedLocations() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_LOCATIONS_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    const places = new Map();
    for (const entry of stored) {
      if (entry && isMapLocation(entry.latitude, entry.longitude)) {
        const place = createLocation(entry.latitude, entry.longitude, entry);
        places.set(place.key, place);
      }
    }
    return [...places.values()];
  } catch {
    return [];
  }
}

export function placeFromResult(result) {
  if (!result || typeof result !== 'object') return null;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!isMapLocation(latitude, longitude)) return null;
  const address = result.address || {};
  const town = address.city || address.town || address.village || address.municipality || result.name;
  const region = address.state || address.region;
  return createLocation(latitude, longitude, {
    title: [town, region].filter(Boolean).join(', ') || 'Selected location',
    address: result.display_name || '',
  });
}

// Submitted searches only: no autocomplete or background polling. Cache repeat lookups.
// Public Nominatim permits at most one request/second across an application.
// For a high-traffic deployment, point GEOCODER_URL at a suitably provisioned service.
async function lookup(path, parameters, signal) {
  const url = GEOCODER_URL + path + '?' + new URLSearchParams({ format: 'jsonv2', 'accept-language': 'en', ...parameters });
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (lookupCache.has(url)) return lookupCache.get(url);
  const now = Date.now();
  const start = Math.max(now, nextLookupTime);
  nextLookupTime = start + 1100;
  if (start > now) {
    await new Promise((resolve, reject) => {
      function cancel() {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        reject(new DOMException('Cancelled', 'AbortError'));
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', cancel);
        resolve();
      }, start - now);
      signal?.addEventListener('abort', cancel, { once: true });
    });
  }
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Place lookup is unavailable. Try coordinates instead.');
  const data = await response.json();
  if (data.error) throw new Error('No address was found for this point.');
  if (lookupCache.size >= 100) lookupCache.delete(lookupCache.keys().next().value);
  lookupCache.set(url, data);
  return data;
}

export async function searchLocations(query, signal) {
  const results = await lookup('/search', { q: query, countrycodes: 'ph', addressdetails: '1', limit: '5' }, signal);
  if (!Array.isArray(results)) throw new Error('Place lookup returned an invalid response.');
  const places = results.map(placeFromResult).filter(Boolean);
  return [...new Map(places.map(place => [place.key, place])).values()];
}

export async function reverseLocation(latitude, longitude, signal) {
  const result = await lookup('/reverse', { lat: latitude.toFixed(5), lon: longitude.toFixed(5), addressdetails: '1' }, signal);
  const place = placeFromResult(result);
  // Keep the actual clicked/device coordinates, rather than a geocoder's nearby point.
  return createLocation(latitude, longitude, place || {});
}
