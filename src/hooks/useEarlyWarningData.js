// Loads this page's recent UTC observations and weather feed independently of month filters.
import { useEffect, useState } from 'react';
import { loadTimelineObservations } from '../lib/data';
import { loadFireWeather } from '../lib/fire-weather';
import { REPEAT_WINDOW_HOURS } from '../lib/early-warning';

const emptyWeather = { connected: false, provider: '', readings: [] };
const initial = { observations: [], weather: emptyWeather, observationError: '', weatherError: '', sample: null, loading: true, loadedAt: null };

export default function useEarlyWarningData(asOf) {
  const [result, setResult] = useState(initial);

  useEffect(function loadReviewData() {
    const controller = new AbortController();
    let cancelled = false;
    let expired = false;
    setResult(initial);
    const timeout = setTimeout(function stopSlowRequest() {
      expired = true;
      controller.abort();
      if (!cancelled) setResult({ ...initial, loading: false, observationError: 'Observation request timed out. Please refresh.', weatherError: 'Weather request timed out. Please refresh.' });
    }, 20000);

    async function load() {
      const start = new Date(asOf - REPEAT_WINDOW_HOURS * 3600000).toISOString().slice(0, 10);
      const end = new Date(asOf).toISOString().slice(0, 10);
      const responses = await Promise.allSettled([
        loadTimelineObservations(start, end, '', controller.signal),
        loadFireWeather(controller.signal),
      ]);
      clearTimeout(timeout);
      if (cancelled || expired) return;
      const next = { ...initial, loading: false, loadedAt: Date.now() };
      if (responses[0].status === 'fulfilled') {
        next.observations = responses[0].value.records;
        next.sample = responses[0].value.demo;
      } else {
        next.observationError = 'Recent observations could not load. Refresh to retry.';
      }
      if (responses[1].status === 'fulfilled') {
        next.weather = responses[1].value;
      } else {
        next.weatherError = responses[1].reason?.message || 'Weather data could not load.';
      }
      setResult(next);
    }
    load();
    return function cleanUpRequest() { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [asOf]);

  return result;
}
