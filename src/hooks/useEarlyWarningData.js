// Monitoring uses real data only, independently of dashboard month and sensor filters.
import { useEffect, useState } from 'react';
import { loadTimelineObservations } from '../lib/data';
import { normalizeDashboardCoverage } from '../lib/dashboard-statistics';
import { fetchMonitoringWeather, fetchTemperatureReference } from '../lib/monitoring-weather';
import { utcDate } from '../lib/monitoring-indicators';

const empty = { observations: [], weather: null, reference: { values: [] }, ranges: [],
  observationError: '', weatherError: '', referenceError: '', coverageError: '', loading: false, loadedAt: null };
export default function useEarlyWarningData(asOf, place, radius) {
  const [result, setResult] = useState(empty);
  const key = JSON.stringify([asOf, place?.latitude, place?.longitude, radius]);
  useEffect(() => {
    if (!place) { setResult({ ...empty, key }); return; }
    let active = true;
    const controller = new AbortController();
    setResult({ ...empty, key, loading: true });
    const timeout = setTimeout(() => {
      active = false; controller.abort();
      setResult(previous => ({ ...previous, loading: false,
        observationError: previous.observationsDone ? previous.observationError : 'Satellite request timed out. Refresh to retry.',
        weatherError: previous.weatherDone ? previous.weatherError : 'Weather request timed out. Refresh to retry.',
        referenceError: previous.referenceDone ? previous.referenceError : 'Historical reference timed out.',
        coverageError: previous.coverageDone ? previous.coverageError : 'Coverage request timed out.' }));
    }, 30000);
    const update = patch => { if (active) setResult(previous => ({ ...previous, ...patch })); };
    const latDelta = radius / 110;
    const lonDelta = radius / (110 * Math.cos(place.latitude * Math.PI / 180));
    const bounds = { south: place.latitude - latDelta, north: place.latitude + latDelta, west: place.longitude - lonDelta, east: place.longitude + lonDelta };
    const tasks = [
      loadTimelineObservations(utcDate(asOf - 30 * 86400000), utcDate(asOf), '', controller.signal, bounds)
        .then(response => {
          if (response.demo) throw new Error('Supabase is not configured. Sample observations are excluded from monitoring.');
          update({ observations: response.records.filter(row => ['MODIS', 'VIIRS'].includes(row.sensor)), observationsDone: true });
        }).catch(error => update({ observationError: error.message || 'Satellite observations could not load.', observationsDone: true })),
      fetchMonitoringWeather(place, asOf, controller.signal)
        .then(weather => update({ weather, weatherDone: true }))
        .catch(error => update({ weatherError: error.message, weatherDone: true })),
      fetchTemperatureReference(place, asOf, controller.signal)
        .then(reference => update({ reference, referenceDone: true }))
        .catch(error => update({ referenceError: error.message, referenceDone: true })),
      fetch(import.meta.env.BASE_URL + 'data/dashboard-coverage.json', { signal: controller.signal, cache: 'no-cache' })
        .then(async response => {
          if (!response.ok) throw new Error('Source coverage metadata unavailable.');
          update({ ranges: normalizeDashboardCoverage(await response.json()).ranges, coverageDone: true });
        }).catch(error => update({ coverageError: error.message, coverageDone: true })),
    ];
    Promise.allSettled(tasks).then(() => { clearTimeout(timeout); update({ loading: false, loadedAt: Date.now() }); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [key]);
  return result.key === key ? result : { ...empty, loading: !!place };
}
