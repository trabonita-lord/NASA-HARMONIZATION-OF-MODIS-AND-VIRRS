import React, { useEffect, useState } from 'react';
import { fetchDailyHistoricalWeather } from '../lib/open-meteo-history';
import HistoricalWindSummary, { windMetrics } from './HistoricalWindSummary';
import { readSavedLocations } from '../lib/location-tools';

export const weatherMetrics = [
  ['temperature_2m_mean', 'Average temperature', '°C'],
  ['temperature_2m_max', 'Maximum temperature', '°C'],
  ['temperature_2m_min', 'Minimum temperature', '°C'],
  ['precipitation_sum', 'Daily precipitation', 'mm'],
  ['relative_humidity_2m_mean', 'Average relative humidity', '%'],
  ['wind_speed_10m_max', 'Maximum wind speed', 'km/h'],
];

export default function DailyWeatherSummary({ date, location }) {
  const [saved] = useState(readSavedLocations);
  const [choice, setChoice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  const place = choice ? saved.find(item => item.key === choice) : location;
  const latitude = place?.latitude;
  const longitude = place?.longitude;
  const requestKey = JSON.stringify([date, latitude, longitude, attempt]);
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const controller = new AbortController();
    let active = true;
    setState({ key: requestKey, loading: true });
    const timeout = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setState({ key: requestKey, error: 'Weather request timed out. Please retry.' });
    }, 20000);
    fetchDailyHistoricalWeather({ latitude, longitude, date, signal: controller.signal })
      .then(data => { if (active) setState({ key: requestKey, data }); })
      .catch(error => { if (active) setState({ key: requestKey, error: error.message }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [date, latitude, longitude, requestKey]);
  const current = state?.key === requestKey ? state : null;
  const data = current?.data;
  const hasData = data && [...weatherMetrics, ...windMetrics].some(([field]) => data[field] !== null);
  const partial = hasData && (weatherMetrics.some(([field]) => data[field] === null) || data.wind_speed_hours < 24 || data.wind_direction_hours + data.wind_calm_hours < 24 || data.wind_gust_hours < 24);
  const loading = place && (!current || current.loading);
  const status = !place ? 'SELECT LOCATION' : loading ? 'LOADING' : current?.error ? 'UNAVAILABLE' : !hasData ? 'NO DATA' : partial ? 'PARTIAL DATA' : 'DATA CONNECTED';
  return <section className="daily-weather-card" aria-labelledby="daily-weather-title" aria-busy={!!loading}>
    <div className="daily-weather-heading">
      <div><div className="section-caption">WEATHER / {date} UTC</div><h3 id="daily-weather-title">Daily weather</h3></div>
      <span className={'daily-weather-status' + (hasData ? ' is-connected' : '')} role="status">{status}</span>
    </div>
    <h4>Historical Weather Conditions</h4>
    <label className="daily-weather-location">Weather location
      <select value={choice} onChange={event => setChoice(event.target.value)}>
        <option value="">{location ? 'Selected map location' : 'Choose a saved location'}</option>
        {saved.map(item => <option key={item.key} value={item.key}>{item.title} ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})</option>)}
      </select>
    </label>
    {place ? <p className="daily-weather-note">{place.title || 'Selected location'} · {latitude.toFixed(4)}, {longitude.toFixed(4)}</p> : <p className="daily-weather-note">Select a point using the map Location Tool, or choose a saved location above. Weather describes one location, not all fire observations.</p>}
    {loading && <p role="status">Loading historical weather…</p>}
    {current?.error && <p role="alert">{current.error}</p>}
    {data && !hasData && <p>No historical weather is available for this location and date. Recent archive dates may still be processing.</p>}
    {hasData && <dl className="daily-weather-metrics">{weatherMetrics.map(([field, label, unit]) => <div key={field}><dt>{label}</dt><dd>{data[field] == null ? 'Unavailable' : `${data[field].toFixed(1)} ${unit}`}</dd></div>)}</dl>}
    {data && <HistoricalWindSummary data={data} />}
    {place && !loading && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry weather request</button>}
    <p className="daily-weather-note">Provider: <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Open-Meteo Historical Weather API</a>. Modeled historical estimates for a UTC day; air temperature is measured at 2 m and wind at 10 m. These are not satellite brightness temperatures. Missing values are shown as unavailable.</p>
  </section>;
}
