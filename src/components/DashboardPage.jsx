// FULL PAGE DASHBOARD: chart/table data is separate from the map's selected month.
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Map, BellRing, CalendarDays, Database, ArrowUpRight, RefreshCcw } from 'lucide-react';
import DashboardCharts from './DashboardCharts';
import useDashboardData from '../hooks/useDashboardData';
import { readSavedLocations, SAVED_LOCATIONS_KEY } from '../lib/location-tools';
import { REFERENCE_START, REFERENCE_END, STUDY_AREA_ID, dashboardArea, calculateDashboard, validComparisonWindow } from '../lib/dashboard-statistics';
import './dashboard.css';

function number(value, decimals = 0) {
  return value == null ? 'N/A' : value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}
function signed(value) {
  return value == null ? 'N/A' : (value > 0 ? '+' : '') + number(value, 2);
}
function tableCount(value, complete) {
  if (!complete && value === 0) return '—';
  return number(value) + (!complete ? ' †' : '');
}

export default function DashboardPage({ onNavigate }) {
  const [places, setPlaces] = useState(readSavedLocations);
  const [areaKey, setAreaKey] = useState(STUDY_AREA_ID);
  const [radius, setRadius] = useState(10);
  const [start, setStart] = useState(REFERENCE_START);
  const [end, setEnd] = useState(REFERENCE_END);
  const [method, setMethod] = useState('mean');
  const [reloadKey, setReloadKey] = useState(0);
  const data = useDashboardData(reloadKey);
  const selectedPlace = places.find(place => place.key === areaKey) || null;
  const area = useMemo(() => dashboardArea(selectedPlace, radius), [selectedPlace, radius]);
  const validWindow = validComparisonWindow(start, end);
  const model = useMemo(() => calculateDashboard(data.records, area, data.coverage.ranges, data.sample, method, start, end), [data.records, area, data.coverage.ranges, data.sample, method, start, end]);
  const comparison = model.comparison;
  const methodLabel = method === 'median' ? 'Median' : 'Average';

  useEffect(function syncPlaces() {
    function sync(event) { if (event.key === SAVED_LOCATIONS_KEY || event.key === null) setPlaces(readSavedLocations()); }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function refresh() { setPlaces(readSavedLocations()); setReloadKey(value => value + 1); }
  function compareMonth(month) { setStart(month.start); setEnd(month.end); }

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading"><div><div className="dashboard-eyebrow">TANAW / OBSERVATION ANALYTICS</div><h1>Dashboard</h1><p>Monthly MODIS and VIIRS observations · {REFERENCE_START} to {REFERENCE_END}</p></div><button type="button" className="dashboard-primary-button" onClick={() => onNavigate('map')}><Map size={16} /> Open map <ArrowUpRight size={15} /></button></header>

      {/* NAVIGATION HUB: the map is removed while this page is displayed. */}
      <nav className="dashboard-shortcuts" aria-label="Dashboard page shortcuts">
        <button type="button" onClick={() => onNavigate('map')}><Map /><span><b>Map & layers</b><small>Explore observations</small></span><ArrowUpRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('warnings')}><BellRing /><span><b>Early Warning</b><small>Review nearby conditions</small></span><ArrowUpRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('calendar')}><CalendarDays /><span><b>Activity calendar</b><small>Inspect individual dates</small></span><ArrowUpRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('sources')}><Database /><span><b>Data & methodology</b><small>Understand the sources</small></span><ArrowUpRight size={15} /></button>
      </nav>

      <section className="dashboard-card dashboard-filter-card" aria-label="Dashboard comparison filters">
        <div className="dashboard-card-heading"><h2><BarChart3 size={16} /> Comparison settings</h2><button type="button" className="dashboard-secondary-button" disabled={data.loading} onClick={refresh}><RefreshCcw size={13} /> Reload data</button></div>
        <div className="dashboard-filters">
          <label>Area<select aria-label="Dashboard area" value={selectedPlace ? selectedPlace.key : STUDY_AREA_ID} onChange={event => setAreaKey(event.target.value)}><option value={STUDY_AREA_ID}>Philippines map extent</option>{places.map(place => <option key={place.key} value={place.key}>{place.title} ({place.latitude.toFixed(3)}, {place.longitude.toFixed(3)})</option>)}</select></label>
          {selectedPlace && <label>Radius<select aria-label="Dashboard area radius" value={radius} onChange={event => setRadius(Number(event.target.value))}><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select></label>}
          <label>Compare from<input aria-label="Dashboard comparison start" type="date" min={REFERENCE_START} max={REFERENCE_END} value={start} onChange={event => setStart(event.target.value)} /></label>
          <label>Compare through<input aria-label="Dashboard comparison end" type="date" min={REFERENCE_START} max={REFERENCE_END} value={end} onChange={event => setEnd(event.target.value)} /></label>
          <label>Reference method<select aria-label="Dashboard reference method" value={method} onChange={event => setMethod(event.target.value)}><option value="mean">Average daily count</option><option value="median">Median daily count</option></select></label>
        </div>
        {!validWindow && <p className="dashboard-error" role="alert">Choose a valid comparison window within {REFERENCE_START} to {REFERENCE_END}.</p>}
        <p className="dashboard-note">Both charts and the table always cover the full requested range. These dates choose the summary comparison window. Saved-location circles are clipped to the Philippines map extent.</p>
      </section>

      {data.loading ? <div className="dashboard-message" role="status">Loading observation counts and source coverage...</div> : data.error ? <div className="dashboard-error" role="alert">{data.error} <button type="button" onClick={refresh}>Retry</button></div> : <>
        {data.sample && <div className="dashboard-message dashboard-sample" role="status"><b>SAMPLE DATA ONLY</b> These counts and reference values describe the existing five sample observations, not complete historical fire activity.</div>}
        {!data.sample && (model.reference.total == null || data.coverageError) && <div className="dashboard-message" role="status">{data.coverageError || 'Full source coverage is not declared for this range. Loaded counts may be partial; reference comparisons stay unavailable until coverage is confirmed.'}</div>}

        {comparison && <>
          <div className="dashboard-selection-heading"><h2>{start} to {end}</h2><span>{area.label} · {comparison.days} days · UTC</span></div>
          <div className="dashboard-metrics">
            <div className="dashboard-metric dashboard-metric-modis"><span>MODIS LOADED</span><strong>{number(comparison.counts.MODIS)}</strong><small>{comparison.complete.MODIS ? data.sample ? 'Sample observations' : 'Declared source coverage' : 'Coverage unconfirmed'}</small></div>
            <div className="dashboard-metric dashboard-metric-viirs"><span>VIIRS LOADED</span><strong>{number(comparison.counts.VIIRS)}</strong><small>{comparison.complete.VIIRS ? data.sample ? 'Sample observations' : 'Declared source coverage' : 'Coverage unconfirmed'}</small></div>
            <div className="dashboard-metric"><span>TOTAL LOADED</span><strong>{number(comparison.counts.total)}</strong><small>Satellite observations</small></div>
            <div className="dashboard-metric dashboard-metric-reference"><span>{methodLabel.toUpperCase()} REFERENCE EXPECTED</span><strong>{number(comparison.expected.total, 2)}</strong><small>Daily reference × {comparison.days} days</small></div>
          </div>
          <section className="dashboard-reference-card" aria-label="Within-range reference comparison"><div><span className="dashboard-eyebrow">{data.sample ? 'SAMPLE REFERENCE' : 'WITHIN-RANGE REFERENCE'}</span><h2>Difference from the reference</h2><p>Reference period: <b>{REFERENCE_START} to {REFERENCE_END}</b> ({model.referenceDays} days), {methodLabel.toLowerCase()} daily counts for the same area, scaled to the comparison window.</p><p className="dashboard-note">This is not a multi-year same-season baseline. Earlier-year data would be needed for that comparison.</p></div><div className="dashboard-difference"><strong>{signed(comparison.difference.count)}</strong><span>observations vs reference</span><b>{comparison.difference.percent == null ? 'Percentage: N/A' : signed(comparison.difference.percent) + '%'}</b><small>{comparison.expected.total === 0 ? 'Percentage is undefined for a zero reference.' : comparison.expected.total == null ? 'Reference awaits complete source coverage.' : method === 'mean' && start === REFERENCE_START && end === REFERENCE_END ? 'The full range equals its own mean reference.' : 'Count difference divided by reference × 100.'}</small></div></section>
        </>}

        <DashboardCharts months={model.months} method={method} sample={data.sample} />
        <section className="dashboard-card dashboard-table-card"><div className="dashboard-card-heading"><h2>Monthly comparison table</h2><span>Click a month to compare that window</span></div><div className="dashboard-table-scroll"><table><caption>MODIS/VIIRS loaded observations and {methodLabel.toLowerCase()} within-range reference. November ends on {REFERENCE_END}. † marks partial source counts; — means no count with confirmed coverage. N/A is unavailable or a percentage with a zero reference.</caption><thead><tr><th scope="col">Month 2026</th><th scope="col">Days</th><th scope="col">MODIS</th><th scope="col">VIIRS</th><th scope="col">Loaded total</th><th scope="col">Reference expected</th><th scope="col">Difference</th><th scope="col">Difference %</th></tr></thead><tbody>{model.months.map(month => <tr key={month.label} className={start === month.start && end === month.end ? 'dashboard-selected-row' : ''}><th scope="row"><button type="button" aria-label={'Compare ' + month.label + ' 2026'} onClick={() => compareMonth(month)}>{month.label}{month.label === 'Nov' ? ` 1-${Number(month.end.slice(8))}` : ''}</button></th><td>{month.days}</td><td className="dashboard-modis-value">{tableCount(month.counts.MODIS, month.complete.MODIS)}</td><td className="dashboard-viirs-value">{tableCount(month.counts.VIIRS, month.complete.VIIRS)}</td><td>{tableCount(month.counts.total, month.complete.total)}</td><td>{number(month.expected.total, 2)}</td><td>{signed(month.difference.count)}</td><td>{month.difference.percent == null ? 'N/A' : signed(month.difference.percent) + '%'}</td></tr>)}</tbody></table></div></section>
        <p className="dashboard-note">Counts represent satellite observations, not unique fires. Missing dates are not treated as verified zero activity in live comparisons. Source coverage must be declared before live reference values are calculated. Mean/median daily rates use all declared days, including genuine zero-count days.</p>
      </>}
    </div>
  );
}
