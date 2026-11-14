// Loads only the map's selected dates. Monthly dashboard totals keep their existing loader.
import { useEffect, useRef, useState } from 'react';
import { loadTimelineObservations } from '../lib/data';
import { loadForecastData } from '../lib/forecast-data';
import { HISTORY_END, timelineWindow } from '../lib/timeline-utils';

const initialState = { records: [], loading: false, error: '', sample: false, forecastConnected: false, selectionKey: null };

export default function useMapTimeline({ enabled, date, windowDays, sensor, reloadKey }) {
  const [result, setResult] = useState(initialState);
  const cache = useRef(new Map());
  const period = timelineWindow(date, windowDays);
  const selectionKey = [period.start, period.end, sensor, reloadKey].join('|');

  useEffect(function loadMapDates() {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    const key = [period.start, period.end, sensor, reloadKey].join('|');
    if (cache.current.has(key)) {
      setResult(cache.current.get(key));
      return;
    }
    let expired = false;
    const timeout = setTimeout(function expireSlowRequest() {
      expired = true;
      controller.abort();
      if (!cancelled) setResult({ ...initialState, selectionKey: key, error: 'Map data timed out. Please retry.' });
    }, 20000);
    setResult({ ...initialState, selectionKey: key, loading: true });

    async function load() {
      const historyEnd = period.end < HISTORY_END ? period.end : HISTORY_END;
      const history = period.start <= HISTORY_END ? loadTimelineObservations(period.start, historyEnd, sensor, controller.signal) : Promise.resolve({ records: [], demo: false });
      const forecast = period.end > HISTORY_END ? loadForecastData(controller.signal) : Promise.resolve({ connected: false, records: [] });
      const requests = await Promise.allSettled([history, forecast]);
      clearTimeout(timeout);
      if (cancelled || expired) return;
      const next = { ...initialState, records: [], selectionKey: key };
      const errors = [];
      if (requests[0].status === 'fulfilled') {
        next.records = requests[0].value.records;
        next.sample = requests[0].value.demo;
      } else {
        errors.push('Historical observations could not load.');
      }
      if (requests[1].status === 'fulfilled') {
        next.forecastConnected = requests[1].value.connected;
        const predictions = requests[1].value.records.filter(record =>
          record.acq_date >= period.start && record.acq_date <= period.end &&
          (!sensor || record.sensor === 'FORECAST' || record.sensor === sensor));
        next.records = [...next.records, ...predictions];
      } else {
        errors.push(requests[1].reason?.message || 'Forecast data could not load.');
      }
      next.error = errors.join(' ');
      if (!next.error) {
        if (cache.current.size >= 32) cache.current.delete(cache.current.keys().next().value);
        cache.current.set(key, next);
      }
      setResult(next);
    }
    load();
    return function stopOldRequest() { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [enabled, period.start, period.end, sensor, reloadKey]);

  // Never display records belonging to the previous date while the next request starts.
  if (enabled && result.selectionKey !== selectionKey) return { ...initialState, loading: true, period };
  return { ...result, period };
}
