// FORECAST CONNECTION: Replace loadForecastData's fetch with your model/API when ready.
// No forecast coordinates are invented. The supplied JSON starts with an empty array.
import { validLocation } from './map-utils';
import { FORECAST_END, HISTORY_END, validTimelineDate } from './timeline-utils';

export function normalizeForecastPayload(data) {
  if (!data || !Array.isArray(data.predictions)) throw new Error('Forecast data must contain a predictions array.');
  const connected = typeof data.model === 'string' && Boolean(data.model.trim()) &&
    typeof data.issued_at === 'string' && Number.isFinite(Date.parse(data.issued_at));
  if (!connected && data.predictions.length) throw new Error('Forecast data needs a model name and issued_at timestamp.');
  const records = [];
  const keys = new Set();
  for (const [index, prediction] of data.predictions.entries()) {
    const date = prediction?.date;
    if (!validTimelineDate(date) || date <= HISTORY_END ||
        !validLocation(prediction.latitude, prediction.longitude) ||
        (prediction.probability != null && (typeof prediction.probability !== 'number' || !Number.isFinite(prediction.probability) || prediction.probability < 0 || prediction.probability > 1))) {
      throw new Error('Forecast row ' + (index + 1) + ' has invalid dates, coordinates, or probability.');
    }
    if (date > FORECAST_END) continue;
    const id = String(prediction.id ?? index);
    if (keys.has(id)) throw new Error('Forecast data has a duplicate prediction ID.');
    keys.add(id);
    records.push({
      id: 'forecast-' + id, kind: 'forecast', acq_date: date,
      latitude: Number(prediction.latitude), longitude: Number(prediction.longitude),
      sensor: ['MODIS', 'VIIRS'].includes(prediction.sensor) ? prediction.sensor : 'FORECAST',
      probability: prediction.probability ?? null, model: data.model, issued_at: data.issued_at,
    });
  }
  return { connected, records };
}

export async function loadForecastData(signal) {
  const response = await fetch(import.meta.env.BASE_URL + 'data/fire-forecast.json', { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('Forecast data could not load.');
  return normalizeForecastPayload(await response.json());
}
