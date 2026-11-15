// EARLY WARNING PAGE: three requested sections. No automatic emergency alert is issued.
import React, { useEffect, useMemo, useState } from 'react';
import { ThermometerSun, Droplets, Wind, Sun, MapPin, Repeat2, RefreshCcw, CloudSun } from 'lucide-react';
import { readSavedLocations, SAVED_LOCATIONS_KEY } from '../lib/location-tools';
import {
  nearbyObservations, repeatedDetections, observationTime, formatWarningTime,
  REPEAT_WINDOW_HOURS, REPEAT_DISTANCE_KM, MIN_REPEAT_GAP_MINUTES,
} from '../lib/early-warning';
import useEarlyWarningData from '../hooks/useEarlyWarningData';
import './early-warning.css';

// Labels correspond to the weather-feed schema in fire-weather.js.
const weatherFactors = [
  { field: 'temperature_c', signal: 'high_temperature', title: 'High temperature', unit: '°C', icon: ThermometerSun },
  { field: 'relative_humidity_pct', signal: 'low_humidity', title: 'Low humidity', unit: '%', icon: Droplets },
  { field: 'wind_speed_kmh', signal: 'strong_winds', title: 'Strong winds', unit: 'km/h', icon: Wind },
  { field: 'dry_days', signal: 'prolonged_dryness', title: 'Prolonged dryness', unit: 'dry days', icon: Sun },
];

export default function EarlyWarningPage({ onOpenLocations, onViewOnMap }) {
  const [places, setPlaces] = useState(readSavedLocations);
  const [selectedKey, setSelectedKey] = useState('');
  const [radius, setRadius] = useState(10);
  const [recentHours, setRecentHours] = useState(24);
  const [asOf, setAsOf] = useState(() => Date.now());
  const data = useEarlyWarningData(asOf);
  const place = places.find(item => item.key === selectedKey) || places[0] || null;

  function refresh() {
    setPlaces(readSavedLocations());
    setAsOf(previous => Math.max(Date.now(), previous + 1));
  }

  useEffect(function refreshOpenPage() {
    const interval = setInterval(refresh, 60000);
    function syncSavedPlaces(event) {
      if (event.key === SAVED_LOCATIONS_KEY || event.key === null) setPlaces(readSavedLocations());
    }
    window.addEventListener('storage', syncSavedPlaces);
    return function cleanUp() { clearInterval(interval); window.removeEventListener('storage', syncSavedPlaces); };
  }, []);

  const nearby = useMemo(() => nearbyObservations(data.observations, place, radius, recentHours, asOf), [data.observations, place, radius, recentHours, asOf]);
  const repeated = useMemo(() => repeatedDetections(data.observations, place, radius, asOf), [data.observations, place, radius, asOf]);
  const missingTimes = data.observations.filter(record => record.kind !== 'forecast' && observationTime(record) == null).length;
  const weatherReading = data.weather.readings.find(reading => reading.location_key === place?.key);
  const futureWeather = weatherReading && weatherReading.observedAt > asOf + 300000;
  const weather = futureWeather ? null : weatherReading;
  const risk = weather?.risk_level ? weather.risk_level.replace('_', ' ') : null;

  return (
    <div className="early-warning-page">
      <p className="warning-introduction">Review weather conditions and recent satellite detections around a saved location. This page uses recent UTC data, independently of the monthly dashboard filters.</p>
      <div className="warning-refresh-row"><span className="warning-source-badge">{data.loading ? 'LOADING DATA' : data.sample === true ? 'SAMPLE OBSERVATIONS' : data.observationError ? 'OBSERVATIONS UNAVAILABLE' : 'CONNECTED OBSERVATIONS'}</span><button type="button" aria-label="Refresh early warning data" disabled={data.loading} onClick={refresh}><RefreshCcw size={13} /> Refresh</button></div>
      <p className="warning-data-time">Review time: {formatWarningTime(asOf)}<br />Refreshes every minute while this page is open.</p>
      <div className="warning-location-controls">
        <label>Saved location<select aria-label="Early warning saved location" value={place?.key || ''} onChange={event => setSelectedKey(event.target.value)} disabled={!places.length}>{!places.length && <option value="">No saved locations</option>}{places.map(item => <option key={item.key} value={item.key}>{item.title} ({item.latitude.toFixed(3)}, {item.longitude.toFixed(3)})</option>)}</select></label>
        <div><label>Search radius<select aria-label="Nearby hotspot radius" value={radius} onChange={event => setRadius(Number(event.target.value))}><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select></label><label>Recent detections<select aria-label="Recent hotspot time window" value={recentHours} onChange={event => setRecentHours(Number(event.target.value))}><option value={6}>Last 6 hours</option><option value={24}>Last 24 hours</option><option value={48}>Last 48 hours</option></select></label></div>
        <button type="button" className="warning-outline-button" onClick={onOpenLocations}><MapPin size={13} /> Manage saved locations</button>
      </div>
      {!place && <div className="warning-information">Save a location with the map's Location Tool, then return here to review nearby conditions.</div>}

      {/* 1. FIRE-WEATHER RISK: measurements/flags come only from the connected provider. */}
      <section className="warning-section" aria-label="Fire-weather risk">
        <div className="warning-section-title"><CloudSun size={17} /><h2>Fire-weather risk</h2></div>
        <span className="warning-section-status">{data.loading ? 'Loading weather...' : data.weatherError ? 'Weather unavailable' : !place ? 'Choose a saved location' : !data.weather.connected ? 'Awaiting weather feed' : futureWeather ? 'Weather timestamp needs review' : !weather ? 'No reading for this location' : risk ? 'Provider-assessed risk: ' + risk : 'Risk not assessed'}</span>
        {data.weatherError && <p className="warning-error" role="alert">{data.weatherError}</p>}
        <div className="warning-weather-grid">
          {weatherFactors.map(factor => {
            const value = weather?.[factor.field];
            const flag = weather?.signals[factor.signal];
            const Icon = factor.icon;
            return <div className={'warning-weather-factor' + (flag === true ? ' warning-factor-flagged' : '')} key={factor.field}><Icon size={16} /><span>{factor.title}</span><strong>{value == null ? '—' : factor.field === 'dry_days' ? value : value.toFixed(1)}<small>{factor.unit}</small></strong><em>{flag === true ? 'Flagged by provider' : flag === false ? 'Not flagged by provider' : 'Not assessed'}</em></div>;
          })}
        </div>
        {weather && <p className="warning-note">{data.weather.provider}<br />Weather observation: {formatWarningTime(weather.observedAt)}</p>}
        <p className="warning-note">Weather readings, threshold flags, and risk labels require your connected feed. No automatic warning thresholds are assumed.</p>
      </section>

      {/* 2. NEARBY: distance is calculated locally; acquisition time is required. */}
      <section className="warning-section" aria-label="New hotspot nearby">
        <div className="warning-section-title"><MapPin size={17} /><h2>New hotspot nearby</h2><b className="warning-count">{data.loading || data.observationError || !place ? '—' : nearby.length}</b></div>
        <p className="warning-note">Within {radius} km · last {recentHours} hours · all sensors</p>
        {data.observationError ? <p className="warning-error" role="alert">{data.observationError}</p> : data.loading ? <p className="warning-empty">Loading recent observations...</p> : !place ? <p className="warning-empty">Choose a saved location to search nearby.</p> : nearby.length === 0 ? <p className="warning-empty">No matching recent observations in the loaded data. This does not establish that the area is fire-free.</p> : <ol className="warning-observation-list">{nearby.slice(0, 8).map((record, index) => <li key={String(record.id) + '-' + index}><div><b>{record.sensor} · {record.distanceKm.toFixed(2)} km away</b><span>{record.satellite || 'Satellite not supplied'}</span><time>{formatWarningTime(record.observedAt)}</time></div><button type="button" aria-label={'View nearby hotspot ' + (index + 1) + ' on map'} onClick={() => onViewOnMap(Number(record.latitude), Number(record.longitude))}>View on map</button></li>)}</ol>}
        {nearby.length > 8 && <p className="warning-note">Showing the 8 most recent of {nearby.length} matching detections.</p>}
      </section>

      {/* 3. REPEATED: spatial candidates across separated acquisition windows. */}
      <section className="warning-section" aria-label="Repeated detections">
        <div className="warning-section-title"><Repeat2 size={17} /><h2>Repeated detections</h2><b className="warning-count">{data.loading || data.observationError || !place ? '—' : repeated.length}</b></div>
        <p className="warning-note">Within {radius} km of your location. Groups use a {REPEAT_DISTANCE_KM} km anchor radius over {REPEAT_WINDOW_HOURS} hours, with acquisition windows at least {MIN_REPEAT_GAP_MINUTES} minutes apart.</p>
        {data.observationError ? <p className="warning-empty">Repeated-detection review is unavailable until observations load.</p> : data.loading ? <p className="warning-empty">Checking acquisition windows...</p> : !place ? <p className="warning-empty">Choose a saved location to review repeated detections.</p> : repeated.length === 0 ? <p className="warning-empty">No repeated groups meet these review settings in the loaded data.</p> : <ol className="warning-observation-list">{repeated.slice(0, 5).map((group, index) => <li key={group.key}><div><b>Review candidate {index + 1}</b><span>{group.acquisitionWindows} acquisition windows · {group.records.length} observations</span><time>First: {formatWarningTime(group.firstSeen)}<br />Latest: {formatWarningTime(group.lastSeen)}</time></div><button type="button" aria-label={'View repeated detection group ' + (index + 1) + ' on map'} onClick={() => onViewOnMap(Number(group.latest.latitude), Number(group.latest.longitude))}>View on map</button></li>)}</ol>}
        {repeated.length > 5 && <p className="warning-note">Showing the 5 most recently observed of {repeated.length} groups.</p>}
        <p className="warning-note">Acquisition-window groups are candidates for review; they do not confirm the same physical fire or continued burning.</p>
      </section>
      {missingTimes > 0 && <p className="warning-information">{missingTimes} loaded observations have missing or invalid acquisition times and are excluded from recent/repeated-detection review.</p>}
    </div>
  );
}
