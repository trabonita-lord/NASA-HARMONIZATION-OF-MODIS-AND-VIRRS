
import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, CalendarDays, GitCompareArrows, Database, Layers,
  PanelRightClose, PanelRightOpen, Menu, Crosshair, CircleHelp, X, RefreshCcw,
  Satellite, ChevronRight, Maximize2, Grid2X2,
} from 'lucide-react';
import { loadSummary, loadCalendar } from './lib/data';
import { configured } from './lib/supabase';
import { monthRange, observationBounds } from './lib/map-utils';
import FireMap from './components/FireMap';
import Filters from './components/Filters';
import LayersPanel from './components/LayersPanel';
import OverviewPage from './components/OverviewPage';
import MapPage from './components/MapPage';
import CalendarPage from './components/CalendarPage';
import ComparisonPage from './components/ComparisonPage';
import SourcesPage from './components/SourcesPage';
import DatePopup from './components/DatePopup';
import SplashScreen from './components/SplashScreen';
import CountUpNumber from './components/CountUpNumber';
import './workspace.css';

export default function App() {
  // 1. EXISTING SELECTIONS AND DATA
  const [showSplash, setShowSplash] = useState(true);
  const [showPopup, setShowPopup] = useState(true);
  const [page, setPage] = useState('overview');
  const [month, setMonth] = useState('2026-11');
  const [sensor, setSensor] = useState('');
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 2. NEW PRESENTATION CONTROLS: These never change the stored data.
  const [panelOpen, setPanelOpen] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [basemap, setBasemap] = useState('satellite');
  const [layers, setLayers] = useState({ modis: true, viirs: true, grid: false, coordinates: true });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapWarning, setMapWarning] = useState('');
  const mapReference = useRef(null);

  const period = monthRange(month);
  const startDate = period.start;
  const endDate = period.end;

  useEffect(function closeOldDatePopup() {
    setSelectedDate(null);
  }, [month, sensor, page]);

  useEffect(function loadSelectedPeriod() {
    let isCurrentRequest = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.all([
          loadSummary(startDate, endDate, sensor),
          loadCalendar(startDate, endDate, sensor),
        ]);
        if (isCurrentRequest) {
          setRecords(results[0].records);
          setTotal(results[0].count);
          setCounts(results[1]);
        }
      } catch (requestError) {
        if (isCurrentRequest) setError(requestError.message);
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }

    loadData();
    return function ignoreOldResponse() { isCurrentRequest = false; };
  }, [startDate, endDate, sensor, reloadKey]);

  // 3. EXISTING SUMMARY VALUES: Sensor toggles affect the map, not these counts.
  let modis = 0;
  let viirs = 0;
  let days = 0;
  for (const record of records) {
    if (record.sensor === 'MODIS') modis = modis + 1;
    if (record.sensor === 'VIIRS') viirs = viirs + 1;
  }
  for (const date in counts) {
    if (counts[date] > 0) days = days + 1;
  }

  // 4. SIDEBAR / TOOLBAR ACTIONS
  function openPage(nextPage) {
    setPage(nextPage);
    setPanelOpen(true);
  }
  function closeDatePopup() { setSelectedDate(null); }
  function closeWelcomePopup() { setShowPopup(false); }
  function retryLoading() { setReloadKey(previous => previous + 1); }

  function changeMonth(value) {
    // Clearing a month input must never create an invalid date or crash the app.
    if (monthRange(value)) setMonth(value);
  }
  function shiftMonth(amount) {
    const year = Number(month.slice(0, 4));
    const number = Number(month.slice(5, 7));
    const nextMonth = new Date(Date.UTC(year, number - 1 + amount, 1));
    changeMonth(nextMonth.toISOString().slice(0, 7));
  }
  function changeLayer(name, checked) {
    setLayers(previous => ({ ...previous, [name]: checked }));
  }
  function changeBasemap(value) {
    setBasemap(value);
    setMapWarning('');
  }
  function locateCoordinate(latitude, longitude) {
    setSelectedLocation([latitude, longitude]);
    if (mapReference.current) mapReference.current.setView([latitude, longitude], 9);
  }
  function fitObservations() {
    const map = mapReference.current;
    if (!map) return;
    const bounds = observationBounds(records);
    if (bounds) {
      let rightPadding = 35;
      if (panelOpen && map.getSize().x > 1000) rightPadding = 420;
      map.fitBounds(bounds, { paddingTopLeft: [90, 60], paddingBottomRight: [rightPadding, 85], maxZoom: 8 });
    } else {
      map.setView([12.5, 122.5], 5);
    }
  }
  function railClass(name) {
    if (page === name && panelOpen) return 'rail-button rail-button-active';
    return 'rail-button';
  }
  function handleWelcomeKey(event) {
    if (event.key === 'Escape') closeWelcomePopup();
  }

  const titles = {
    overview: 'Overview', map: 'Fires & layers', calendar: 'Activity calendar',
    compare: 'Sensor comparison', sources: 'Data & methodology', help: 'Workspace guide',
  };
  const welcomePopupVisible = showPopup && !showSplash && !loading;
  const animateNumbers = !showSplash && !loading;
  let workspaceClass = 'firms-workspace dashboard-ready';
  if (showSplash) workspaceClass = 'firms-workspace dashboard-waiting';

  // 5. VISIBLE WORKSPACE: The map is never unmounted when changing pages.
  return (
    <>
      {showSplash && <SplashScreen onFinish={setShowSplash} />}
      {welcomePopupVisible && (
        <div className="popup" role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title" onKeyDown={handleWelcomeKey}>
          <div className="popup-content">
            <div className="section-caption">YOUR OBSERVATION WORKSPACE</div>
            <h1 id="welcome-popup-title">Welcome to TANAW</h1>
            <p>Explore MODIS and VIIRS observations on the full-screen map. Open your existing pages from the sidebar, or use Layers to show coordinates and control sensor visibility.</p>
            <button type="button" onClick={closeWelcomePopup} autoFocus>Explore the map <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <div className={workspaceClass} inert={showSplash || welcomePopupVisible}>
        {/* HEADER: TANAW branding, not an official NASA product banner. */}
        <header className="workspace-topbar">
          <button className="header-icon-button" type="button" aria-label="Toggle navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(!navigationOpen)}><Menu size={23} /></button>
          <div className="workspace-brand">
            <img src="/assets/tanaw-owl-flame.png" alt="TANAW owl" />
          </div>
          <div className="workspace-header-divider" />
          <span className="workspace-header-caption">THERMAL AND NETWORK ANALYTICS WATCH</span>
          <div className="workspace-header-actions">
            <span className="workspace-data-status"><i />{configured ? 'DATABASE CONNECTED' : 'SAMPLE MODE'}</span>
            <button type="button" className="header-icon-button" aria-label="Open workspace guide" onClick={() => openPage('help')}><CircleHelp size={21} /></button>
          </div>
        </header>

        <main className="map-workspace" aria-label="Thermal activity map workspace">
          {/* FULL-SCREEN MAP: One instance shared by every panel. */}
          <FireMap records={records} layers={layers} basemap={basemap} mapReference={mapReference} selectedLocation={selectedLocation} onBasemapWarning={setMapWarning} />

          {/* SIDEBAR: Existing pages remain available as direct buttons. */}
          {navigationOpen && (
            <nav className="workspace-rail" aria-label="Workspace pages">
              <button type="button" className={railClass('overview')} aria-pressed={page === 'overview' && panelOpen} title="Overview" onClick={() => openPage('overview')}><Activity size={22} /><span>Overview</span></button>
              <button type="button" className={railClass('map')} aria-pressed={page === 'map' && panelOpen} title="Fire hotspot map and layers" onClick={() => openPage('map')}><Layers size={22} /><span>Layers</span></button>
              <button type="button" className={railClass('calendar')} aria-pressed={page === 'calendar' && panelOpen} title="Activity calendar" onClick={() => openPage('calendar')}><CalendarDays size={22} /><span>Calendar</span></button>
              <button type="button" className={railClass('compare')} aria-pressed={page === 'compare' && panelOpen} title="Sensor comparison" onClick={() => openPage('compare')}><GitCompareArrows size={22} /><span>Compare</span></button>
              <button type="button" className={railClass('sources')} aria-pressed={page === 'sources' && panelOpen} title="Data and methodology" onClick={() => openPage('sources')}><Database size={22} /><span>Sources</span></button>
              <div className="rail-separator" />
              <button type="button" className="rail-button" title="Fit observations" onClick={fitObservations}><Crosshair size={22} /><span>Fit view</span></button>
            </nav>
          )}

          {/* MAP STATUS: Clearly distinguish sample data, errors, and hidden layers. */}
          <div className="map-period-chip"><Satellite size={14} /><span>OBSERVATIONS <b>{month}</b> · {sensor || 'All sensors'}</span>{loading && <RefreshCcw size={13} className="loading-spinner" />}</div>
          {error && <div className="workspace-error" role="alert"><span>Observations could not load: {error}</span><button type="button" onClick={retryLoading}>Retry</button></div>}
          {mapWarning && <div className="workspace-warning" role="status"><span>{mapWarning}</span><button type="button" aria-label="Dismiss map notice" onClick={() => setMapWarning('')}><X size={15} /></button></div>}
          {!layers.modis && !layers.viirs && <div className="map-empty-layer-note">Sensor layers are hidden. Turn them on in Layers.</div>}

          {/* RIGHT PANEL: Same features, placed above the map like the reference. */}
          {panelOpen ? (
            <aside className="workspace-panel" aria-label={titles[page]}>
              <div className="workspace-panel-header">
                <div><span className="section-caption">TANAW WORKSPACE</span><h1>{titles[page]}</h1></div>
                <button type="button" className="panel-close-button" aria-label="Close side panel" onClick={() => setPanelOpen(false)}><PanelRightClose size={21} /></button>
              </div>
              <div className="workspace-panel-scroll">
                {/* PERIOD FILTERS: Existing month arrows, month picker, and sensor filter. */}
                <section className="panel-period">
                  <div className="panel-section-label">OBSERVATION PERIOD <span>UTC</span></div>
                  <Filters month={month} sensor={sensor} onMonthChange={changeMonth} onSensorChange={setSensor} onChangeMonth={shiftMonth} />
                </section>

                {/* SUMMARY BOX GRID: Same four values and count-up animations. */}
                <div className="summary-cards workspace-summary">
                  <div className="summary-card summary-card-total"><span>OBSERVATIONS</span><strong><CountUpNumber value={total} enabled={animateNumbers} /></strong><small>Selected period</small></div>
                  <div className="summary-card summary-card-modis"><span>MODIS</span><strong><CountUpNumber value={modis} enabled={animateNumbers} delay={100} /></strong><small>Displayed sample</small></div>
                  <div className="summary-card summary-card-viirs"><span>VIIRS</span><strong><CountUpNumber value={viirs} enabled={animateNumbers} delay={200} /></strong><small>Displayed sample</small></div>
                  <div className="summary-card summary-card-days"><span>ACTIVE DAYS</span><strong>{days}</strong><small>With observations</small></div>
                </div>

                <div className="workspace-page-content">
                  {page === 'overview' && <OverviewPage onOpenLayers={() => openPage('map')} />}
                  {page === 'map' && <><MapPage /><LayersPanel layers={layers} onChangeLayer={changeLayer} basemap={basemap} onChangeBasemap={changeBasemap} onLocate={locateCoordinate} modis={modis} viirs={viirs} /></>}
                  {page === 'calendar' && <CalendarPage month={month} counts={counts} onSelectDate={setSelectedDate} />}
                  {page === 'compare' && <ComparisonPage modis={modis} viirs={viirs} />}
                  {page === 'sources' && <SourcesPage />}
                  {page === 'help' && (
                    <section className="workspace-help">
                      <h2>Explore the workspace</h2>
                      <p><b>Map:</b> drag to pan, scroll or use + / − to zoom. Click a colored observation for its details.</p>
                      <p><b>Layers:</b> toggle sensors, background imagery, the coordinate readout, or the latitude/longitude grid.</p>
                      <p><b>Calendar:</b> choose a date to open your existing pie-chart and table popup.</p>
                      <p><b>Fit view:</b> center all fetched observations. Close this panel for an unobstructed map.</p>
                      <p>Counts describe satellite observations, not unique fires. Background imagery is separate from the selected month's observation data.</p>
                    </section>
                  )}
                </div>
                <div className="workspace-panel-footer">NASA FIRMS source data · TANAW prototype<br />Not an operational emergency warning service.</div>
              </div>
            </aside>
          ) : (
            <button type="button" className="reopen-panel-button" onClick={() => setPanelOpen(true)}><PanelRightOpen size={18} /> Open panel</button>
          )}

          {/* BOTTOM TOOLBAR: Every visible tool has a working action. */}
          <div className="workspace-toolbar" role="toolbar" aria-label="Map tools">
            <button type="button" onClick={() => openPage('map')}><Layers size={21} /><span>Layers</span></button>
            <button type="button" onClick={() => changeLayer('grid', !layers.grid)} aria-pressed={layers.grid}><Grid2X2 size={21} /><span>Lat / Lon</span></button>
            <button type="button" onClick={() => openPage('calendar')}><CalendarDays size={21} /><span>Calendar</span></button>
            <button type="button" onClick={fitObservations}><Crosshair size={21} /><span>Fit view</span></button>
            <button type="button" onClick={() => setPanelOpen(!panelOpen)} aria-pressed={!panelOpen}><Maximize2 size={21} /><span>{panelOpen ? 'Full map' : 'Panel'}</span></button>
          </div>
          <div className="map-sensor-legend" aria-label="Map sensor colors"><span><i className="modis-swatch" />MODIS</span><span><i className="viirs-swatch" />VIIRS</span></div>
        </main>
      </div>
      {selectedDate && <DatePopup date={selectedDate} onClose={closeDatePopup} />}
    </>
  );
}
