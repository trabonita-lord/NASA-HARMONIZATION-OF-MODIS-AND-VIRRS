// WEATHER CONNECTION: replace this file's fetch with your team's weather API when ready.
// Risk levels and signal flags must come from that provider; no thresholds are invented here.
const riskLevels = ['low', 'moderate', 'high', 'very_high', 'extreme'];
const signalNames = ['high_temperature', 'low_humidity', 'strong_winds', 'prolonged_dryness'];
const fields = ['temperature_c', 'relative_humidity_pct', 'wind_speed_kmh', 'dry_days'];

export function normalizeWeatherPayload(data) {
  if (!data || !Array.isArray(data.readings)) throw new Error('Weather data needs a readings array.');
  const connected = typeof data.provider === 'string' && Boolean(data.provider.trim());
  if (!connected && data.readings.length) throw new Error('Weather readings need a provider name.');
  const keys = new Set();
  const readings = data.readings.map((reading, index) => {
    if (!reading || typeof reading.location_key !== 'string' || !reading.location_key.trim()) throw new Error('Weather row ' + (index + 1) + ' needs a location_key.');
    const key = reading.location_key.trim();
    if (keys.has(key)) throw new Error('Weather data has a duplicate location_key.');
    keys.add(key);
    const observedAt = Date.parse(reading.observed_at || data.updated_at);
    if (!Number.isFinite(observedAt)) throw new Error('Weather readings need a valid observed_at timestamp.');
    const normalized = { location_key: key, observedAt, risk_level: reading.risk_level ?? null, signals: {} };
    if (normalized.risk_level != null && !riskLevels.includes(normalized.risk_level)) throw new Error('Weather risk_level is invalid.');
    for (const field of fields) {
      const value = reading[field];
      if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || (field !== 'temperature_c' && value < 0) || (field === 'relative_humidity_pct' && value > 100) || (field === 'dry_days' && !Number.isInteger(value)))) {
        throw new Error('Weather field ' + field + ' is invalid.');
      }
      normalized[field] = value ?? null;
    }
    for (const name of signalNames) {
      const value = reading.signals?.[name];
      if (value != null && typeof value !== 'boolean') throw new Error('Weather signal ' + name + ' must be true, false, or null.');
      normalized.signals[name] = value ?? null;
    }
    return normalized;
  });
  return { connected, provider: connected ? data.provider : '', readings };
}

export async function loadFireWeather(signal) {
  const response = await fetch(import.meta.env.BASE_URL + 'data/fire-weather.json', { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('Weather data could not load.');
  return normalizeWeatherPayload(await response.json());
}
