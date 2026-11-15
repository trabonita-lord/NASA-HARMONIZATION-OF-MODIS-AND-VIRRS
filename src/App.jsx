
import React, { useEffect, useRef, useState } from 'react';
import {
  Activity, CalendarDays, GitCompareArrows, Database, Layers,
  PanelRightClose, PanelRightOpen, Menu, Crosshair, CircleHelp, X, RefreshCcw,
  Satellite, ChevronRight, Maximize2, Grid2X2, MapPin, Clock3, BellRing, LayoutDashboard, Ruler,
} from 'lucide-react';
import { loadSummary, loadCalendar } from './lib/data';
import { configured } from './lib/supabase';
import { monthRange, observationBounds } from './lib/map-utils';
import FireMap from './components/FireMap';
import DashboardPage from './components/DashboardPage';
import Filters from './components/Filters';
import LayersPanel from './components/LayersPanel';
import OverviewPage from './components/OverviewPage';
import MapPage from './components/MapPage';
import CalendarPage from './components/CalendarPage';
import ComparisonPage from './components/ComparisonPage';
import SourcesPage from './components/SourcesPage';
import EarlyWarningPage from './components/EarlyWarningPage';
import DatePopup from './components/DatePopup';
import SplashScreen from './components/SplashScreen';
import CountUpNumber from './components/CountUpNumber';
import MapTimeline from './components/MapTimeline';
import MapExportTools from './components/MapExportTools';
import { readMapView } from './lib/map-share';
import useMapTimeline from './hooks/useMapTimeline';
import { HISTORY_END, clampTimelineDate, validTimelineDate } from './lib/timeline-utils';
import './workspace.css';

export default function App() {
  // A shared link restores presentation settings only; observation data is loaded normally.
  const [sharedView, setSharedView] = useState(() => readMapView(window.location.href));
  // 1. EXISTING SELECTIONS AND DATA
  const [showSplash, setShowSplash] = useState(true);
  const [showPopup, setShowPopup] = useState(!sharedView);
  const [page, setPage] = useState(sharedView ? 'map' : 'overview');
  const [month, setMonth] = useState(sharedView?.month || '2026-11');
  const [sensor, setSensor] = useState(sharedView?.sensor || '');
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 2. NEW PRESENTATION CONTROLS: These never change the stored data.
  const [panelOpen, setPanelOpen] = useState(!sharedView);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [basemap, setBasemap] = useState(sharedView?.basemap || 'satellite');
  const [layers, setLayers] = useState(sharedView?.layers || { modis: true, viirs: true, grid: false, coordinates: true, wind: false });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapWarning, setMapWarning] = useState('');
  const [locationToolOpen, setLocationToolOpen] = useState(false);
  const [areaMeasureOpen, setAreaMeasureOpen] = useState(false);
  // Timeline selections affect the map; existing monthly dashboard data is kept separate.
  const [timelineOpen, setTimelineOpen] = useState(sharedView?.timelineOpen || false);
  const [timelineDate, setTimelineDate] = useState(sharedView?.timelineDate || HISTORY_END);
  const [timelineDays, setTimelineDays] = useState(sharedView?.timelineDays || 1);
  const [timelineReloadKey, setTimelineReloadKey] = useState(0);
  const timeline = useMapTimeline({ enabled: timelineOpen, date: timelineDate, windowDays: timelineDays, sensor, reloadKey: timelineReloadKey });
  const mapRecords = timelineOpen ? timeline.records : records;
  const mapReference = useRef(null);

  useEffect(function restoreChangedShareLink() {
    function restoreView() {
      const view = readMapView(window.location.href);
      if (!view) return;
      setSharedView(view);
      setPage('map');
      setMonth(view.month);
      setSensor(view.sensor);
      setBasemap(view.basemap);
      setLayers(view.layers);
      setTimelineOpen(view.timelineOpen);
      setTimelineDate(view.timelineDate);
      setTimelineDays(view.timelineDays);
      setPanelOpen(false);
      setLocationToolOpen(false);
      setAreaMeasureOpen(false);
      setSelectedDate(null);
      setShowPopup(false);
      mapReference.current?.setView(view.center, view.zoom, { animate: false });
    }
    window.addEventListener('hashchange', restoreView);
    window.addEventListener('popstate', restoreView);
    return () => {
      window.removeEventListener('hashchange', restoreView);
      window.removeEventListener('popstate', restoreView);
    };
  }, []);

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
    setTimelineOpen(false);
    setLocationToolOpen(false);
    setAreaMeasureOpen(false);
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
    const bounds = observationBounds(mapRecords);
    if (bounds) {
      let rightPadding = 35;
      if (panelOpen && map.getSize().x > 1000) rightPadding = 420;
      map.fitBounds(bounds, { paddingTopLeft: [90, 60], paddingBottomRight: [rightPadding, 85], maxZoom: 8 });
    } else {
      map.setView([12.5, 122.5], 5);
    }
  }
  function changeTimelineDate(value) {
    if (validTimelineDate(value)) setTimelineDate(clampTimelineDate(value));
  }
  function toggleTimeline() {
    setTimelineOpen(!timelineOpen);
    if (!timelineOpen) { setPanelOpen(false); setLocationToolOpen(false); setAreaMeasureOpen(false); }
  }
  function railClass(name) {
    if (page === name && (name === 'dashboard' || panelOpen)) return 'rail-button rail-button-active';
    return 'rail-button';
  }
  function handleWelcomeKey(event) {
    if (event.key === 'Escape') closeWelcomePopup();
  }

  const titles = {
    dashboard: 'Dashboard', overview: 'Overview', map: 'Fires & layers', calendar: 'Activity calendar',
    compare: 'Sensor comparison', warnings: 'Early Warning', sources: 'Data & methodology', help: 'Workspace guide',
  };
  const welcomePopupVisible = showPopup && !showSplash && !loading;
  const animateNumbers = !showSplash && !loading;
  let workspaceClass = 'firms-workspace dashboard-ready';
  if (showSplash) workspaceClass = 'firms-workspace dashboard-waiting';

  // 5. VISIBLE WORKSPACE: Dashboard replaces the map; other pages use the shared map.
  return (
    <>
      {showSplash && <SplashScreen onFinish={setShowSplash} ready={!loading} />}
      {welcomePopupVisible && (
        <div className="popup" role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title" onKeyDown={handleWelcomeKey}>
          <div className="popup-content"> 
            <h1 id="welcome-popup-title">Welcome to TANAW</h1>
              <p>A harmonized web-based platform for VIIRS and MODIS i monitoring thermal activity and network analytics.</p>
            <button type="button" onClick={closeWelcomePopup} autoFocus>Explore<ChevronRight size={16} /></button>
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
           
            <button type="button" className="header-icon-button" aria-label="Open workspace guide" onClick={() => openPage('help')}><CircleHelp size={21} /></button>
          </div>
        </header>

        <main className={page === 'dashboard' ? (navigationOpen ? 'dashboard-workspace' : 'dashboard-workspace dashboard-navigation-hidden') : timelineOpen ? 'map-workspace timeline-visible' : 'map-workspace'} data-navigation-open={navigationOpen} aria-label={page === 'dashboard' ? 'Analytics dashboard' : 'Thermal activity map workspace'}>
          {/* SIDEBAR: Existing pages remain available as direct buttons. */}
          {navigationOpen && (
            <nav className="workspace-rail" aria-label="Workspace pages">
              <button type="button" className={railClass('dashboard')} aria-pressed={page === 'dashboard'} title="Dashboard" onClick={() => openPage('dashboard')}><LayoutDashboard size={22} /><span>Dashboard</span></button>
              <button type="button" className={railClass('overview')} aria-pressed={page === 'overview' && panelOpen} title="Overview" onClick={() => openPage('overview')}><Activity size={22} /><span>Overview</span></button>
              <button type="button" className={railClass('map')} aria-pressed={page === 'map' && panelOpen} title="Fire hotspot map and layers" onClick={() => openPage('map')}><Layers size={22} /><span>Layers</span></button>
              <button type="button" className={railClass('warnings')} aria-pressed={page === 'warnings' && panelOpen} title="Early Warning" onClick={() => openPage('warnings')}><BellRing size={22} /><span>Warnings</span></button>
              <button type="button" className={railClass('calendar')} aria-pressed={page === 'calendar' && panelOpen} title="Activity calendar" onClick={() => openPage('calendar')}><CalendarDays size={22} /><span>Calendar</span></button>
              <button type="button" className={railClass('compare')} aria-pressed={page === 'compare' && panelOpen} title="Sensor comparison" onClick={() => openPage('compare')}><GitCompareArrows size={22} /><span>Compare</span></button>
              <button type="button" className={railClass('sources')} aria-pressed={page === 'sources' && panelOpen} title="Data and methodology" onClick={() => openPage('sources')}><Database size={22} /><span>Sources</span></button>
              {page !== 'dashboard' && (<>
              <div className="rail-separator" />
              <button type="button" className="rail-button" title="Fit observations" onClick={fitObservations}><Crosshair size={22} /><span>Fit view</span></button>
              </>)}
            </nav>
          )}

          {page === 'dashboard' ? <DashboardPage onNavigate={openPage} /> : (<>
          {/* FULL-SCREEN MAP: Shared by the map panels; removed on Dashboard. */}
          <FireMap records={mapRecords} sharedView={sharedView} timelineActive={timelineOpen} layers={layers} basemap={basemap} mapReference={mapReference} selectedLocation={selectedLocation} onBasemapWarning={setMapWarning} locationToolOpen={locationToolOpen} onCloseLocationTool={() => setLocationToolOpen(false)} areaMeasureOpen={areaMeasureOpen} onCloseAreaMeasure={() => setAreaMeasureOpen(false)} />

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
                {page !== 'warnings' && (<>
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

                </>)}
``
                <div className="workspace-page-content">
                  {page === 'overview' && <OverviewPage onOpenLayers={() => openPage('map')} />}
                  {page === 'map' && <><MapPage /><LayersPanel layers={layers} onChangeLayer={changeLayer} basemap={basemap} onChangeBasemap={changeBasemap} onLocate={locateCoordinate} modis={modis} viirs={viirs} /></>}
                  {page === 'calendar' && <CalendarPage month={month} counts={counts} onSelectDate={setSelectedDate} />}
                  {page === 'compare' && <ComparisonPage modis={modis} viirs={viirs} records={records} />}
                  {page === 'sources' && <SourcesPage />}
                  {page === 'warnings' && <EarlyWarningPage onOpenLocations={() => { setPanelOpen(false); setTimelineOpen(false); setLocationToolOpen(true); }} onViewOnMap={(latitude, longitude) => { setPanelOpen(false); setTimelineOpen(false); setLocationToolOpen(false); locateCoordinate(latitude, longitude); }} />}
                  {page === 'help' && (
                    <section className="workspace-help">
                      <h2>About TANAW</h2>
                      <p>TANAW helps people explore satellite observations of hot spots. It brings MODIS and VIIRS observations together on a map and calendar so researchers, students, and emergency responders can review where and when satellites detected unusual heat.</p>
                      <h3>Frequently asked questions</h3>
                      <details><summary>What is this website for?</summary><p>It is a research and learning tool for viewing and comparing satellite hot-spot observations. Its goal is to make the data easier to explore, explain, and discuss.</p></details>
                      <details><summary>What do MODIS and VIIRS show?</summary><p>They are instruments on Earth-observing satellites. The map shows locations where their data identified a thermal anomaly. A marker is a satellite observation, not a confirmed fire boundary.</p></details>
                      <details><summary>Why compare the two sensors?</summary><p>MODIS and VIIRS observe Earth with different instruments and viewing schedules. Comparing their detections can help users study similarities and differences, but a match by itself does not prove both sensors saw the same fire.</p></details>
                      <details><summary>Can TANAW confirm a fire or predict where one will spread?</summary><p>No. A hot-spot detection may represent a fire or another heat source, and this prototype does not confirm incidents, map fire perimeters, or predict spread. Check authoritative local reports and field information.</p></details>
                      <details><summary>Can emergency responders use it?</summary><p>Responders can use the map as an exploratory reference alongside official alerts and ground reports. It is not an operational alerting or dispatch system, and should not be the only source for safety decisions.</p></details>
                      <details><summary>Does it include live weather or live satellite data?</summary><p>Not automatically. The current project uses its connected or supplied observation dataset. Weather feeds and live NASA data need to be connected separately before they appear.</p></details>
                      <details><summary>What does the calendar count?</summary><p>It groups satellite observations by acquisition date in UTC. A count is the number of observations, not the number of separate fires.</p></details>
                      <details><summary>Who can use the website?</summary><p>Researchers can explore and compare observations, students can learn how satellite monitoring works, and response teams can review the map as supplementary context. Always read the data notes and limitations.</p></details>
                      <h3>Quick map guide</h3>
                      <p><b>Map:</b> drag to pan, scroll or use + / − to zoom. Click a colored observation for its details.</p>
                      <p><b>Layers:</b> toggle sensors, background imagery, the coordinate readout, or the latitude/longitude grid.</p>
                      <p><b>Calendar:</b> choose a date to open your existing pie-chart and table popup.</p>
                      <p><b>Fit view:</b> center all fetched observations. Close this panel for an unobstructed map.</p>
                      <p>Counts describe satellite observations, not unique fires. Background imagery is separate from the selected month's observation data.</p>
                    </section>
                  )}
                </div>
              </div>
            </aside>
          ) : (
            <button type="button" className="reopen-panel-button" onClick={() => { setTimelineOpen(false); setPanelOpen(true); }}><PanelRightOpen size={18} /> Open panel</button>
          )}

          <div className="workspace-bottom-controls">
          {timelineOpen && <MapTimeline date={timelineDate} windowDays={timelineDays} data={timeline} onDateChange={changeTimelineDate} onWindowChange={setTimelineDays} onClose={() => setTimelineOpen(false)} onRetry={() => setTimelineReloadKey(value => value + 1)} />}

          {/* BOTTOM TOOLBAR: Every visible tool has a working action. */}
          <div className="workspace-toolbar" role="toolbar" aria-label="Map tools">
            <button type="button" aria-label="Toggle map timeline" aria-pressed={timelineOpen} onClick={toggleTimeline}><Clock3 size={21} /><span>Timeline</span></button>
            <button type="button" aria-label="Toggle location tool" aria-pressed={locationToolOpen} onClick={() => { setTimelineOpen(false); setAreaMeasureOpen(false); setLocationToolOpen(!locationToolOpen); if (!locationToolOpen) setPanelOpen(false); }}><MapPin size={21} /><span>Location</span></button>
            <button type="button" aria-label="Toggle area measurement" aria-pressed={areaMeasureOpen} onClick={() => { setTimelineOpen(false); setLocationToolOpen(false); setAreaMeasureOpen(!areaMeasureOpen); if (!areaMeasureOpen) setPanelOpen(false); }}><Ruler size={21} /><span>Measure</span></button>
            <button type="button" onClick={() => changeLayer('grid', !layers.grid)} aria-pressed={layers.grid}><Grid2X2 size={21} /><span>Lat / Lon</span></button>
            <MapExportTools mapReference={mapReference} loading={timelineOpen ? timeline.loading : loading} settings={{ month, sensor, basemap, layers, timelineOpen, timelineDate, timelineDays }} />
            <button type="button" onClick={() => { setTimelineOpen(false); setPanelOpen(!panelOpen); }} aria-pressed={!panelOpen}><Maximize2 size={21} /><span>{panelOpen ? 'Full map' : 'Panel'}</span></button>
          </div>
          </div>
          <div className="map-sensor-legend" aria-label="Map sensor colors"><span><i className="modis-swatch" />MODIS</span><span><i className="viirs-swatch" />VIIRS</span>{timelineOpen && <span><i style={{ background: '#D4A3FF' }} />Forecast</span>}</div>
          </>)}
        </main>
      </div>
      {page !== 'dashboard' && selectedDate && <DatePopup date={selectedDate} weather={null} onClose={closeDatePopup} />}
    </>
  );
}
