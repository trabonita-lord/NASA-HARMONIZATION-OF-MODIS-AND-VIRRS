// Optional Open-Meteo model-wind layer. No requests occur while disabled or in Timeline mode.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Pane, Popup, useMapEvents } from 'react-leaflet';
import { divIcon, DomEvent } from 'leaflet';
import { Wind, RefreshCcw } from 'lucide-react';
import { windGrid, loadWind, clearWindCache, windCompass, WIND_CACHE_MS } from '../lib/wind-data';
import './wind-layer.css';

function viewport(map) {
  const bounds = map.getBounds();
  const round = value => Number(value.toFixed(3));
  return { south: round(bounds.getSouth()), north: round(bounds.getNorth()), west: round(bounds.getWest()), east: round(bounds.getEast()) };
}

function windIcon(point) {
  // Bearing is finite API-validated data; SVG markup never includes provider text.
  const html = point.flow == null ? '<span class="wind-calm-dot"></span>' : '<span class="wind-arrow" style="transform:rotate(' + point.flow + 'deg)"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V5M8 13L16 5l8 8" /></svg></span>';
  return divIcon({ className: 'wind-direction-icon', html, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -11] });
}

function windTime(time) {
  return new Date(time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
}

export default function WindLayer({ enabled, paused = false, hideStatus = false }) {
  const map = useMapEvents({ moveend: updateViewport, resize: updateViewport });
  const [bounds, setBounds] = useState(() => viewport(map));
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ key: '', points: [], loading: false, error: '' });
  const statusRef = useRef(null);
  const samples = useMemo(() => windGrid(bounds), [bounds]);
  const key = JSON.stringify(samples);

  function updateViewport() { setBounds(viewport(map)); }
  function refresh() { clearWindCache(); setReloadKey(value => value + 1); }

  useEffect(function loadVisibleWind() {
    if (!enabled || paused || !samples.length) return;
    const controller = new AbortController();
    let cancelled = false;
    let expired = false;
    let timeout;
    setData({ key, points: [], loading: true, error: '' });
    // Wait until panning settles; use a single batch request for at most 35 samples.
    const debounce = setTimeout(async function fetchWind() {
      timeout = setTimeout(() => {
        expired = true;
        controller.abort();
        if (!cancelled) setData({ key, points: [], loading: false, error: 'Wind request timed out. Refresh to retry.' });
      }, 15000);
      try {
        const result = await loadWind(samples, controller.signal);
        if (!cancelled && !expired) setData({ ...result, key, loading: false, error: '' });
      } catch {
        if (!cancelled && !expired) setData({ key, points: [], loading: false, error: 'Wind data is unavailable. Check the connection or wind API setting, then refresh.' });
      } finally {
        clearTimeout(timeout);
      }
    }, 650);
    return function cleanUp() { cancelled = true; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [enabled, paused, key, reloadKey]);

  useEffect(function refreshEnabledLayer() {
    if (!enabled || paused) return;
    const timer = setInterval(refresh, WIND_CACHE_MS);
    return () => clearInterval(timer);
  }, [enabled, paused]);

  useEffect(function isolateStatusControls() {
    if (statusRef.current) {
      DomEvent.disableClickPropagation(statusRef.current);
      DomEvent.disableScrollPropagation(statusRef.current);
    }
  }, [enabled, paused, hideStatus]);

  if (!enabled) return null;
  const current = data.key === key ? data : { points: [], loading: true, error: '' };
  const showPoints = !paused && !current.loading && !current.error;
  return (
    <>
      {!hideStatus && <div className="wind-overlay-status" ref={statusRef} role="status"><div><Wind size={14} /><b>10 m model wind</b>{!paused && <button type="button" aria-label="Refresh wind data" disabled={current.loading} onClick={refresh}><RefreshCcw size={13} /></button>}</div><span>{paused ? 'Paused during Timeline: current wind only.' : !samples.length ? 'Move into the Philippines map extent.' : current.loading ? 'Loading wind directions...' : current.error || 'Arrows point downwind. ' + current.points.length + '/' + current.requestedCount + ' samples.'}</span>{showPoints && current.points.length > 0 && <small>Oldest model time: {windTime(current.oldestTime)}</small>}</div>}
      <Pane name="wind-directions" style={{ zIndex: 380 }}>
        {showPoints && current.points.map(point => <Marker key={point.latitude + ',' + point.longitude} pane="wind-directions" position={[point.latitude, point.longitude]} icon={windIcon(point)} attribution='Weather: <a href="https://open-meteo.com/">Open-Meteo</a>' bubblingMouseEvents={false} title={point.from == null ? 'Calm wind' : 'Wind from ' + windCompass(point.from)}>
          <Popup pane="popupPane" className="wind-point-popup" autoPan={false} maxWidth={240}><strong>10 m model wind</strong><br />Speed: {point.speed.toFixed(1)} km/h<br />{point.from == null ? 'Calm - no direction arrow.' : <>From: {windCompass(point.from)} ({point.from.toFixed(0)} degrees)<br />Blowing toward: {windCompass(point.flow)} ({point.flow.toFixed(0)} degrees)</>}<br />Valid: {windTime(point.validAt)}<br />Model estimate at a sampled point, not a direct measurement.</Popup>
        </Marker>)}
      </Pane>
    </>
  );
}
