// QUICK GUIDE
// Search SIDEBAR to edit the logo and each button directly.
// Search SUMMARY BOX GRID to edit the four small boxes directly.
// Search PAGE PANELS to choose which page appears below the boxes.
// Popup, chart, map, and calendar content stay in src/components.

import React, { useEffect, useState } from 'react';
import { Activity, MapPinned, CalendarDays, GitCompareArrows, Database } from 'lucide-react';
import { loadSummary, loadCalendar } from './lib/data';
import { configured } from './lib/supabase';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import OverviewPage from './components/OverviewPage';
import MapPage from './components/MapPage';
import CalendarPage from './components/CalendarPage';
import ComparisonPage from './components/ComparisonPage';
import SourcesPage from './components/SourcesPage';
import Footer from './components/Footer';
import DatePopup from './components/DatePopup';
import SplashScreen from './components/SplashScreen';
import CountUpNumber from './components/CountUpNumber';
import SidebarHighlight from './components/SidebarHighlight';

export default function App() {
  // 1. SELECTIONS AND DATA
  // useState remembers a value. Its set... function changes that value.
  // The splash appears on every full page load or refresh.
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState('overview');
  const [month, setMonth] = useState('2026-11');
  const [sensor, setSensor] = useState('');
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // 2. DATE RANGE FOR THE SELECTED MONTH
  const monthParts = month.split('-');
  const year = Number(monthParts[0]);
  const monthNumber = Number(monthParts[1]);
  const startDate = month + '-01';
  const lastDay = new Date(Date.UTC(year, monthNumber, 0));
  const endDate = lastDay.toISOString().slice(0, 10);

  // Close the date popup when the page or filters change.
  useEffect(function closePopupAfterSelectionChanges() {
    setSelectedDate(null);
  }, [month, sensor, page]);

  // 3. EXISTING DATA LOADING
  useEffect(function loadSelectedMonth() {
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
          const summary = results[0];
          const dailyCounts = results[1];
          setRecords(summary.records);
          setTotal(summary.count);
          setCounts(dailyCounts);
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Ignore an old response if the user has already changed the filters.
    return function stopOldRequest() {
      isCurrentRequest = false;
    };
  }, [startDate, endDate, sensor]);

  // 4. NUMBERS FOR THE SMALL BOXES
  let modis = 0;
  let viirs = 0;
  let days = 0;

  for (const observation of records) {
    if (observation.sensor === 'MODIS') {
      modis = modis + 1;
    }
    if (observation.sensor === 'VIIRS') {
      viirs = viirs + 1;
    }
  }

  for (const date in counts) {
    if (counts[date] > 0) {
      days = days + 1;
    }
  }

  // 5. SIDEBAR BUTTON ACTIONS
  function openOverview() { setPage('overview'); }
  function openMap() { setPage('map'); }
  function openCalendar() { setPage('calendar'); }
  function openComparison() { setPage('compare'); }
  function openSources() { setPage('sources'); }

  function getButtonClass(buttonPage) {
    if (page === buttonPage) {
      return 'sidebar-button sidebar-button-active';
    }
    return 'sidebar-button';
  }

  function closeDatePopup() {
    setSelectedDate(null);
  }

  function changeMonth(numberOfMonths) {
    const nextMonth = new Date(Date.UTC(year, monthNumber - 1 + numberOfMonths, 1));
    setMonth(nextMonth.toISOString().slice(0, 7));
  }

  // 6. CHOOSE THE PAGE CONTENT
  let pageTitle = '';
  let pageContent = null;

  if (page === 'overview') {
    pageTitle = 'Overview';
    pageContent = <OverviewPage records={records} />;
  }
  if (page === 'map') {
    pageTitle = 'Fire hotspot map';
    pageContent = <MapPage records={records} />;
  }
  if (page === 'calendar') {
    pageTitle = 'Activity calendar';
    pageContent = (
      <CalendarPage
        month={month}
        counts={counts}
        onSelectDate={setSelectedDate}
      />
    );
  }
  if (page === 'compare') {
    pageTitle = 'Sensor comparison';
    pageContent = <ComparisonPage modis={modis} viirs={viirs} />;
  }
  if (page === 'sources') {
    pageTitle = 'Data & methodology';
    pageContent = <SourcesPage />;
  }

  // 7. CHOOSE WHETHER TO SHOW MESSAGES AND THE POPUP
  const hasMessages = !configured || Boolean(error) || loading;
  let contentClass = 'page-content';
  if (hasMessages) {
    contentClass = 'page-content page-content-with-notices';
  }

  let popupContent = null;
  if (selectedDate) {
    popupContent = <DatePopup date={selectedDate} onClose={closeDatePopup} />;
  }


  let dashboardClass = 'app-layout dashboard-waiting';
  if (!showSplash) {
    dashboardClass = 'app-layout dashboard-ready';
  }

  const animateNumbers = !showSplash && !loading;

  // 8. VISIBLE LAYOUT: Edit the sidebar and small boxes below.
  return (
    <>
      {showSplash && <SplashScreen onFinish={setShowSplash} />}
      <div className={dashboardClass} inert={showSplash}>
      {/* SIDEBAR: Edit the logo, button text, and icons directly here. */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/assets/tanaw-owl-flame.png" alt="TANAW logo" />
          <div>
            <small>THERMAL ACTIVITY WATCH</small>
          </div>
        </div>

        <div className="sidebar-caption">OBSERVATORY / PH</div>

        {/* Each button opens the page named in setPage(...). */}
        <nav aria-label="Main navigation">
          <SidebarHighlight page={page} />
          {/* BUTTON 1: Overview */}
          <button
            type="button"
            className={getButtonClass('overview')}
            onClick={openOverview}
          >
            <Activity size={17} />
            <span>Overview</span>
            <small>01</small>
          </button>

          {/* BUTTON 2: Map */}
          <button
            type="button"
            className={getButtonClass('map')}
            onClick={openMap}
          >
            <MapPinned size={17} />
            <span>Fire hotspot map</span>
            <small>02</small>
          </button>

          {/* BUTTON 3: Calendar */}
          <button
            type="button"
            className={getButtonClass('calendar')}
            onClick={openCalendar}
          >
            <CalendarDays size={17} />
            <span>Activity calendar</span>
            <small>03</small>
          </button>

          {/* BUTTON 4: Sensor comparison */}
          <button
            type="button"
            className={getButtonClass('compare')}
            onClick={openComparison}
          >
            <GitCompareArrows size={17} />
            <span>Sensor comparison</span>
            <small>04</small>
          </button>

          {/* BUTTON 5: Data and methodology */}
          <button
            type="button"
            className={getButtonClass('sources')}
            onClick={openSources}
          >
            <Database size={17} />
            <span>Data &amp; methodology</span>
            <small>05</small>
          </button>

          <button
          type="button"
          className="sidebar-button">

          </button>
        </nav>
        <div className="sidebar-profile">
          <img src="./dist/assets/fire_owl.png" alt="Profile picture" className="sidebar-avatar" />
          <div>
            <b>TANAW Research</b>
            <small>NASA Space Apps / Prototype</small>
          </div>
        </div>
      </div>

      <main>
        <TopBar title={pageTitle} configured={configured} />

        <div className={contentClass}>
          {/* GRID AREA: heading. Change its position in app.css under CONTENT GRID. */}
          <PageHeader
            title={pageTitle}
            month={month}
            sensor={sensor}
            onMonthChange={setMonth}
            onSensorChange={setSensor}
            onChangeMonth={changeMonth}
          />

      

          {/* GRID AREA: metrics. The four summary cards. */}
          {/* SUMMARY BOX GRID: Move these four divs to change their order.
              In app.css, .summary-cards controls columns and spacing. */}
          <div className="summary-cards">
            {/* BOX 1: Total observations */}
            <div className="summary-card summary-card-total">
              <span>OBSERVATIONS IN PERIOD</span>
              <strong><CountUpNumber value={total} enabled={animateNumbers} delay={100} /></strong>
              <small>Raw satellite detections</small>
            </div>

            {/* BOX 2: MODIS observations */}
            <div className="summary-card summary-card-modis">
              <span>MODIS (DISPLAYED)</span>
              <strong><CountUpNumber value={modis} enabled={animateNumbers} delay={200} /></strong>
              <small>Up to 1,500 rows fetched</small>
            </div>

            {/* BOX 3: VIIRS observations */}
            <div className="summary-card summary-card-viirs">
              <span>VIIRS (DISPLAYED)</span>
              <strong><CountUpNumber value={viirs} enabled={animateNumbers} delay={300} /></strong>
              <small>Up to 1,500 rows fetched</small>
            </div>

            {/* BOX 4: Active days */}
            <div className="summary-card summary-card-days">
              <span>ACTIVE DAYS</span>
              <strong>{days}</strong>
              <small>Days with one or more observations</small>
            </div>
          </div>

          {/* PAGE PANELS: Only the selected page is displayed. */}
          <div className="page-sections">
            {pageContent}
          </div>

          {/* GRID AREA: footer. Project attribution. */}
          <Footer />
        </div>
        {popupContent}
      </main>
      </div>
    </>
  );
}
