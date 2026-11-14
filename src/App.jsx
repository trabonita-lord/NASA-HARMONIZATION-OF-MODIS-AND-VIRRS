import React, { useEffect, useState } from 'react';
import {
  Activity,
  MapPinned,
  CalendarDays,
  GitCompareArrows,
  Database,
  Info,
  RefreshCcw,
} from 'lucide-react';
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

  // 2. DATE RANGE FOR THE SELECTED MONTH
  const monthParts = month.split('-');
  const year = Number(monthParts[0]);
  const monthNumber = Number(monthParts[1]);
  const startDate = month + '-01';
  const lastDay = new Date(Date.UTC(year, monthNumber, 0));
  const endDate = lastDay.toISOString().slice(0, 10);

  // Close the date popup when the page or filters change.
  useEffect(() => {
    setSelectedDate(null);
  }, [month, sensor, page]);

  // 3. DATA LOADING
  useEffect(() => {
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

    return () => {
      isCurrentRequest = false;
    };
  }, [startDate, endDate, sensor]);

  // 4. NUMBERS FOR THE SMALL BOXES
  let modis = 0;
  let viirs = 0;
  let days = 0;

  for (const observation of records) {
    if (observation.sensor === 'MODIS') {
      modis += 1;
    }
    if (observation.sensor === 'VIIRS') {
      viirs += 1;
    }
  }

  for (const date in counts) {
    if (counts[date] > 0) {
      days += 1;
    }
  }

  // 5. SIDEBAR BUTTON ACTIONS
  function openOverview() { setPage('overview'); }
  function openMap() { setPage('map'); }
  function openCalendar() { setPage('calendar'); }
  function openComparison() { setPage('compare'); }
  function openSources() { setPage('sources'); }

  function getButtonClass(buttonPage) {
    return page === buttonPage ? 'sidebar-button sidebar-button-active' : 'sidebar-button';
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

  const hasMessages = !configured || Boolean(error) || loading;
  let contentClass = 'page-content';
  if (hasMessages) {
    contentClass = 'page-content page-content-with-notices';
  }

  const popupContent = selectedDate ? (
    <DatePopup date={selectedDate} onClose={closeDatePopup} />
  ) : null;

  const dashboardClass = showSplash ? 'app-layout dashboard-waiting' : 'app-layout dashboard-ready';
  const animateNumbers = !showSplash && !loading;

  // 8. VISIBLE LAYOUT
  return (
    <>
      {showSplash && <SplashScreen onFinish={setShowSplash} />}
      <div className={dashboardClass} inert={showSplash}>
        <div className="sidebar">
          <div className="sidebar-logo">
            <img src="/assets/tanaw-owl-flame.png" alt="TANAW logo" />
            <div>
              <small>THERMAL ACTIVITY WATCH</small>
            </div>
          </div>

          <div className="sidebar-caption">OBSERVATORY / PH</div>

          <nav aria-label="Main navigation">
            <SidebarHighlight page={page} />

            <button
              type="button"
              className={getButtonClass('overview')}
              onClick={openOverview}
            >
              <Activity size={17} />
              <span>Overview</span>
              <small>01</small>
            </button>

            <button
              type="button"
              className={getButtonClass('map')}
              onClick={openMap}
            >
              <MapPinned size={17} />
              <span>Fire hotspot map</span>
              <small>02</small>
            </button>

            <button
              type="button"
              className={getButtonClass('calendar')}
              onClick={openCalendar}
            >
              <CalendarDays size={17} />
              <span>Activity calendar</span>
              <small>03</small>
            </button>

            <button
              type="button"
              className={getButtonClass('compare')}
              onClick={openComparison}
            >
              <GitCompareArrows size={17} />
              <span>Sensor comparison</span>
              <small>04</small>
            </button>

            <button
              type="button"
              className={getButtonClass('sources')}
              onClick={openSources}
            >
              <Database size={17} />
              <span>Data &amp; methodology</span>
              <small>05</small>
            </button>
          </nav>

          <div className="sidebar-profile">
            <img src="/assets/fire_owl.png" alt="Profile picture" className="sidebar-avatar" />
            <div>
              <b>TANAW Research</b>
              <small>NASA Space Apps / Prototype</small>
            </div>
          </div>
        </div>

        <main>
          <TopBar title={pageTitle} configured={configured} />

          <div className={contentClass}>
            <PageHeader
              title={pageTitle}
              month={month}
              sensor={sensor}
              onMonthChange={setMonth}
              onSensorChange={setSensor}
              onChangeMonth={changeMonth}
            />

            <div className="page-notices">
              {!configured && (
                <div className="info-message">
                  <Info size={18} /> Sample mode: add Supabase credentials to <code>.env</code>, apply the SQL migration and import the supplied NASA FIRMS CSV files for real observations.
                </div>
              )}
              {error && (
                <div className="error-message">
                  <Info size={18} /> Database error: {error}
                </div>
              )}
              {loading && (
                <div className="loading-message">
                  <RefreshCcw size={15} /> Loading observations…
                </div>
              )}
            </div>

            <div className="summary-cards">
              <div className="summary-card summary-card-total">
                <span>OBSERVATIONS IN PERIOD</span>
                <strong>
                  <CountUpNumber value={total} enabled={animateNumbers} delay={100} />
                </strong>
                <small>Raw satellite detections</small>
              </div>

              <div className="summary-card summary-card-modis">
                <span>MODIS (DISPLAYED)</span>
                <strong>
                  <CountUpNumber value={modis} enabled={animateNumbers} delay={200} />
                </strong>
                <small>Up to 1,500 rows fetched</small>
              </div>

              <div className="summary-card summary-card-viirs">
                <span>VIIRS (DISPLAYED)</span>
                <strong>
                  <CountUpNumber value={viirs} enabled={animateNumbers} delay={300} />
                </strong>
                <small>Up to 1,500 rows fetched</small>
              </div>

              <div className="summary-card summary-card-days">
                <span>ACTIVE DAYS</span>
                <strong>{days}</strong>
                <small>Days with one or more observations</small>
              </div>
            </div>

            <div className="page-sections">{pageContent}</div>
            <Footer />
          </div>
          {popupContent}
        </main>
      </div>
    </>
  );
}
