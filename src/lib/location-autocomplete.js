// Open-Meteo supports partial place-name search. Keep public Nominatim for
// individual reverse lookups; its public service must not be used for autocomplete.
import { createLocation, isMapLocation } from './location-tools';

const searchCache = new Map();

export function normalizeSuggestions(data) {
  if (!data || typeof data !== 'object' || data.error ||
      (data.results !== undefined && !Array.isArray(data.results))) {
    throw new Error('Location suggestions returned an invalid response.');
  }
  const places = new Map();
  for (const result of data.results || []) {
    if (!result || result.country_code !== 'PH' || typeof result.name !== 'string' ||
        !result.name.trim() || !isMapLocation(result.latitude, result.longitude)) continue;
    const region = result.admin2 || result.admin1;
    const title = [result.name, region].filter(Boolean).join(', ');
    const address = [...new Set([result.name, result.admin2, result.admin1, result.country || 'Philippines'].filter(Boolean))].join(', ');
    const place = createLocation(result.latitude, result.longitude, { title, address });
    places.set(place.key, place);
  }
  return [...places.values()].slice(0, 8);
}

export async function suggestLocations(query, signal) {
  const text = query.trim().replace(/\s+/g, ' ');
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (text.length < 2) return [];
  const key = text.toLocaleLowerCase('en');
  if (searchCache.has(key)) return searchCache.get(key);
  const parameters = new URLSearchParams({ name: text, count: '8', countryCode: 'PH', language: 'en', format: 'json' });
  const response = await fetch('https://geocoding-api.open-meteo.com/v1/search?' + parameters, {
    signal, headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Location search is temporarily unavailable.');
  const places = normalizeSuggestions(await response.json());
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (searchCache.size >= 100) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, places);
  return places;
}
