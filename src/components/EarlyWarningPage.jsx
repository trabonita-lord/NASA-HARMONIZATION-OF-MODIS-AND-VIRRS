// EARLY WARNING PAGE: descriptive monitoring of saved locations. No automatic emergency alert is issued.
import React, { useEffect, useMemo, useState } from 'react';
import { ThermometerSun, Droplets, Wind, Sun, MapPin, Repeat2, RefreshCcw, CloudSun } from 'lucide-react';
import { readSavedLocations, SAVED_LOCATIONS_KEY } from '../lib/location-tools';
import {
  nearbyObservations, repeatedDetections, observationTime, formatWarningTime,
  REPEAT_WINDOW_HOURS, REPEAT_DISTANCE_KM, MIN_REPEAT_GAP_MINUTES,
} from '../lib/early-warning';
import useEarlyWarningData from '../hooks/useEarlyWarningData';
import './early-warning.css';
import { compareActivity, monitoringIndicators, freshness, MONITORING_CRITERIA } from '../lib/monitoring-indicators';

const weatherFactors = [
  { field: 'temperature_c', title: 'Current air temperature (2 m)', unit: '\u00b0C', icon: ThermometerSun },
  { field: 'relative_humidity_pct', title: 'Current relative humidity', unit: '%', icon: Droplets },
  { field: 'wind_speed_kmh', title: 'Current wind speed (10 m)', unit: 'km/h', icon: Wind },
  { field: 'rainfall_mm', title: 'Precipitation / previous UTC day', unit: 'mm', icon: Droplets },
  { field: 'dry_days', title: 'Consecutive recent dry days', unit: 'days', icon: Sun },
];

export default function EarlyWarningPage({ onOpenLocations, onViewOnMap }) {
  const [places, setPlaces] = useState(readSavedLocations);
  const [selectedKey, setSelectedKey] = useState('');
  const [radius, setRadius] = useState(10);
  const [recentHours, setRecentHours] = useState(24);
  const [asOf, setAsOf] = useState(() => Date.now());
  const place = places.find(item => item.key === selectedKey) || places[0] || null;
  const data = useEarlyWarningData(asOf, place, radius);

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

  const nearby = useMemo(() => nearbyObservations(data.observations, place, radius, recentHours, asOf).filter(row => row.observedAt > asOf - recentHours * 3600000), [data.observations, place, radius, recentHours, asOf]);
  const repeated = useMemo(() => repeatedDetections(data.observations, place, radius, asOf), [data.observations, place, radius, asOf]);
  const missingTimes = data.observations.filter(record => record.kind !== 'forecast' && observationTime(record) == null).length;
  const weather = data.weather;
  const observationReady = !!place && data.observationsDone && !data.observationError;
  const activity = compareActivity({ records: data.observations, place, radius, hours: recentHours, asOf,
    ranges: data.ranges, available: observationReady });
  const indicators = monitoringIndicators({ weather, temperatureReference: data.reference.values, activity, nearby,
    observationsAvailable: observationReady, asOf });
  const nearest = nearby.length ? Math.min(...nearby.map(row => row.distanceKm)) : null;
  const latestLoaded = nearbyObservations(data.observations, place, radius, 30 * 24, asOf)[0];
  const weatherFreshness = freshness(weather?.observedAt, asOf, MONITORING_CRITERIA.weatherMaxAgeHours);
  const satelliteFreshness = freshness(latestLoaded?.observedAt, asOf, MONITORING_CRITERIA.satelliteMaxAgeHours);

  return (
    <div className="early-warning-page">
      <p className="warning-introduction">Review weather conditions and recent satellite detections around a saved location. This page uses recent UTC data, independently of the monthly dashboard filters.</p>
      <div className="warning-refresh-row"><span className="warning-source-badge">{data.loading ? 'LOADING DATA' : !place ? 'SELECT SAVED LOCATION' : data.observationError ? 'OBSERVATIONS UNAVAILABLE' : 'LOADED OBSERVATIONS'}</span><button type="button" aria-label="Refresh early warning data" disabled={data.loading} onClick={refresh}><RefreshCcw size={13} /> Refresh</button></div>
      <p className="warning-data-time">Review time: {formatWarningTime(asOf)}<br />Refreshes every minute while this page is open.</p>
      <div className="warning-location-controls">
        <label>Saved location<select aria-label="Early warning saved location" value={place?.key || ''} onChange={event => setSelectedKey(event.target.value)} disabled={!places.length}>{!places.length && <option value="">No saved locations</option>}{places.map(item => <option key={item.key} value={item.key}>{item.title} ({item.latitude.toFixed(3)}, {item.longitude.toFixed(3)})</option>)}</select></label>
        <div><label>Search radius<select aria-label="Nearby hotspot radius" value={radius} onChange={event => setRadius(Number(event.target.value))}><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select></label><label>Recent detections<select aria-label="Recent hotspot time window" value={recentHours} onChange={event => setRecentHours(Number(event.target.value))}><option value={6}>Last 6 hours</option><option value={24}>Last 24 hours</option><option value={48}>Last 48 hours</option></select></label></div>
        <button type="button" className="warning-outline-button" onClick={onOpenLocations}><MapPin size={13} /> Manage saved locations</button>
      </div>
      {!place && <div className="warning-information">Save a location with the map's Location Tool, then return here to review nearby conditions.</div>}

      <section className="warning-section" aria-label="Weather monitoring">
        <div className="warning-section-title"><CloudSun size={17} /><h2>Weather monitoring</h2></div>
        <span className="warning-section-status">{!place ? 'Choose a saved location' : data.weatherError ? 'Weather unavailable' : !weather ? 'Loading weather...' : `Current estimates / ${weatherFreshness}`}</span>
        {data.weatherError && <p className="warning-error" role="alert">{data.weatherError}</p>}
        <div className="warning-weather-grid">{weatherFactors.map(factor => {
          const value = weather?.[factor.field]; const Icon = factor.icon;
          return <div className="warning-weather-factor" key={factor.field}><Icon size={16} /><span>{factor.title}</span><strong>{value == null ? 'Unavailable' : `${factor.field === 'dry_days' && weather.dry_days_lower_bound ? 'at least ' : ''}${factor.field === 'dry_days' ? value : value.toFixed(1)}`}<small>{factor.unit}</small></strong></div>;
        })}</div>
        <p className="warning-note">Wind from: {weather?.wind_direction_label && weather?.wind_speed_kmh > 0 ? `${weather.wind_direction_label} (${weather.wind_direction_deg.toFixed(0)}\u00b0)` : 'Unavailable / calm'} (meteorological origin). Wind alone does not establish fire spread direction.</p>
        <p className="warning-note">Last weather estimate: {formatWarningTime(weather?.observedAt)} / {weatherFreshness}. Freshness limit: {MONITORING_CRITERIA.weatherMaxAgeHours} hours.<br />
          <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo Weather API</a>: current and recent model estimates, not station measurements or satellite brightness temperatures. Precipitation date: {weather?.rainfall_date || 'Unavailable'} UTC. Dry days use up to 14 completed UTC days; at least means the run may be longer. A missing day makes the dry-day total unavailable.</p>
      </section>

      <section className="warning-section" aria-label="Explainable monitoring indicators">
        <div className="warning-section-title"><ThermometerSun size={17} /><h2>Exploratory monitoring indicators</h2></div>
        <p className="warning-information">{indicators.incomplete ? 'Insufficient data for a complete assessment. ' : ''}{indicators.flagged ? `${indicators.flagged} monitoring criteria met in the available data. Review the factors below.` : indicators.incomplete ? 'Missing factors cannot be interpreted as reassuring conditions.' : 'No configured criteria met. This does not establish low wildfire risk.'}</p>
        <ul className="warning-indicator-list">{indicators.rows.map(row => <li key={row.title} className={row.flag === true ? 'warning-factor-flagged' : ''}><b>{row.title}</b><span>{row.flag === null ? 'Insufficient data' : row.flag ? 'Criterion met' : 'Criterion not met'}</span><small>{row.detail}</small></li>)}</ul>
        <p className="warning-note">Historical temperature reference: {data.reference.startDate || 'Unavailable'} to {data.reference.endDate || 'Unavailable'} UTC; {data.reference.values.length} same-hour samples at this location from a 31-day window centered one year earlier. A short seasonal reference, not a climate normal. Current weather and historical reanalysis are different model products.</p>
        {data.referenceError && <p className="warning-error" role="alert">Historical weather: {data.referenceError}</p>}
        <p className="warning-note">Criteria are configurable exploratory monitoring thresholds, not scientifically validated warning classes or numerical fire probabilities. Stale, future-dated or missing current weather is excluded from threshold assessment.</p>
      </section>

      <section className="warning-section" aria-label="Unusual satellite activity">
        <div className="warning-section-title"><Repeat2 size={17} /><h2>Detected activity comparison</h2></div>
        <span className="warning-section-status">{activity.classification}</span>
        <p className="warning-note">Recent {recentHours}-hour count: {observationReady ? activity.count : 'Unavailable'} / reference mean: {activity.sufficient ? activity.mean.toFixed(2) : 'Withheld'} per {recentHours}-hour window / {activity.windows} source-complete reference windows.</p>
        <p className="warning-note">Reference: nonoverlapping equal-duration windows in the preceding 28 days, using the same {radius} km area and both MODIS and VIIRS. This short reference limits seasonal differences but does not adjust for cloud cover, overpass frequency, sensor outages or detection sensitivity. Both sensors must have declared complete ingestion for the recent and reference windows. Missing coverage prevents classification.</p>
        {data.coverageError && <p className="warning-error" role="alert">{data.coverageError}</p>}
        <p className="warning-note">Source-complete recent window: {activity.completeRecent ? 'Declared' : 'Not verified'}. No detected activity describes source-complete loaded observations only; it does not mean no fire occurred.</p>
      </section>

      {/* 2. NEARBY: distance is calculated locally; acquisition time is required. */}
      <section className="warning-section" aria-label="Nearby satellite observations">
        <div className="warning-section-title"><MapPin size={17} /><h2>Nearby satellite observations</h2><b className="warning-count">{data.loading || data.observationError || !place ? '—' : nearby.length}</b></div>
        <p className="warning-note">Within {radius} km / last {recentHours} hours / MODIS and VIIRS. Individual observations are not distinct wildfire incidents.</p>
        <p className="warning-note">Nearest recent observation: {nearest == null ? 'Unavailable' : `${nearest.toFixed(2)} km`}. Most recent in this window: {formatWarningTime(nearby[0]?.observedAt)}.<br />Latest loaded nearby acquisition (30-day search): {formatWarningTime(latestLoaded?.observedAt)} / {satelliteFreshness} (freshness limit {MONITORING_CRITERIA.satelliteMaxAgeHours} h). Loading data now does not make its observations live. Missing overpass/ingestion coverage remains unknown.</p>
        {data.observationError ? <p className="warning-error" role="alert">{data.observationError}</p> : data.loading ? <p className="warning-empty">Loading recent observations...</p> : !place ? <p className="warning-empty">Choose a saved location to search nearby.</p> : nearby.length === 0 ? <p className="warning-empty">No matching recent observations in the loaded data. This does not establish that the area is fire-free.</p> : <ol className="warning-observation-list">{nearby.slice(0, 8).map((record, index) => <li key={String(record.id) + '-' + index}><div><b>{record.sensor} · {record.distanceKm.toFixed(2)} km away</b><span>{record.satellite || 'Satellite not supplied'} / Confidence (source metadata): {record.confidence ?? 'Unavailable'}</span><time>{formatWarningTime(record.observedAt)}</time></div><button type="button" aria-label={'View nearby hotspot ' + (index + 1) + ' on map'} onClick={() => onViewOnMap(Number(record.latitude), Number(record.longitude))}>View on map</button></li>)}</ol>}
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
      <p className="warning-information">These indicators support situational awareness and are not official wildfire forecasts or emergency alerts.</p>
      <p className="warning-note">Last completed data refresh: {formatWarningTime(data.loadedAt)}. Supabase observations and Open-Meteo estimates have separate acquisition/update times. Confidence fields retain their source sensor scale; MODIS numeric and VIIRS categorical values are not interchangeable.</p>
      {missingTimes > 0 && <p className="warning-information">{missingTimes} loaded observations have missing or invalid acquisition times and are excluded from recent/repeated-detection review.</p>}
    </div>
  );
}
