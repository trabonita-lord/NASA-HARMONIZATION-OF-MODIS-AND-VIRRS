import React, { useEffect, useState } from 'react';
import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
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
  ShieldCheck,
  Info,
  Flame,
  RefreshCcw,
} from "lucide-react";
import { loadSummary, loadCalendar } from "./lib/data";
import { configured } from "./lib/supabase";
const pages = [
  ["overview", "Overview", Activity],
  ["map", "Fire hotspot map", MapPinned],
  ["calendar", "Activity calendar", CalendarDays],
  ["compare", "Sensor comparison", GitCompareArrows],
  ["sources", "Data & methodology", Database],
];
const today = "2026-11-09";
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [month + "-01", end];
}
function FitMap({ records }) {
  const map = useMap();
  useEffect(() => {
    if (records.length) {
      const lats = records.map((x) => x.latitude),
        lons = records.map((x) => x.longitude);
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lons)],
          [Math.max(...lats), Math.max(...lons)],
        ],
        { padding: [24, 24], maxZoom: 8 },
      );
    }
  }, [records, map]);
  return null;
}
function FireMap({ records }) {
  return (
    <div className="mapbox">
      <MapContainer
        center={[12.5, 122.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMap records={records} />
        {records
          .filter(
            (r) =>
              Number.isFinite(Number(r.latitude)) &&
              Number.isFinite(Number(r.longitude)),
          )
          .map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.latitude, r.longitude]}
              radius={4}
              pathOptions={{
                color: r.sensor === "MODIS" ? "#f8b46b" : "#f06555",
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <Popup>
                <strong>{r.sensor}</strong> · {r.satellite}
                <br />
                {r.acq_date}
                <br />
                FRP: {r.frp ?? "N/A"} MW
                <br />
                Confidence: {r.confidence ?? "N/A"}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
function Calendar({ month, counts }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="calendar-grid">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div className="weekday" key={d}>
          {d}
        </div>
      ))}
      {Array.from({ length: first }, (_, i) => (
        <div key={"blank" + i} />
      ))}
      {Array.from({ length: days }, (_, i) => {
        const date = month + "-" + String(i + 1).padStart(2, "0");
        const count = counts[date] || 0;
        return (
          <div
            className="day"
            key={date}
            style={{
              background: count
                ? `rgba(239,105,77,${0.1 + (0.7 * count) / max})`
                : undefined,
            }}
            title={`${date}: ${count.toLocaleString()} satellite observations`}
          >
            <span>{i + 1}</span>
            <b>{count || "·"}</b>
          </div>
        );
      })}
    </div>
  );
}
function Metric({ label, value, sub }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState("overview"),
    [month, setMonth] = useState("2026-11"),
    [sensor, setSensor] = useState(""),
    [records, setRecords] = useState([]),
    [counts, setCounts] = useState({}),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [start, end] = useMemo(() => monthBounds(month), [month]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      loadSummary(start, end, sensor),
      loadCalendar(start, end, sensor),
    ])
      .then(([result, daily]) => {
        if (active) {
          setRecords(result.records);
          setTotal(result.count);
          setCounts(daily);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [start, end, sensor]);
  const modis = records.filter((r) => r.sensor === "MODIS").length,
    viirs = records.filter((r) => r.sensor === "VIIRS").length,
    days = Object.keys(counts).filter((d) => counts[d] > 0).length;
  const changeMonth = (n) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/assets/tanaw-owl-flame.png" alt="TANAW logo" />
          <div>
            <b>TANAW</b>
            <small>THERMAL ACTIVITY WATCH</small>
          </div>
        </div>
        <div className="nav-caption">OBSERVATORY · PH</div>
        <nav>
          {pages.map(([id, name, Icon], i) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={"nav-link " + (page === id ? "active" : "")}
            >
              <Icon size={17} />
              <span>{name}</span>
              <small>0{i + 1}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">T</div>
          <div>
            <b>TANAW Research</b>
            <small>NASA Space Apps · Prototype</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            Workspace <span>/</span>{" "}
            <b>{pages.find((p) => p[0] === page)?.[1]}</b>
          </div>
          <span className="status">
            <span className="dot" />
            {configured ? "SUPABASE CONNECTED" : "SAMPLE MODE"}
          </span>
        </header>
        <div className="content">
          <div className="heading">
            <div>
              <div className="eyebrow">EARTH OBSERVATION · PHILIPPINES</div>
              <h1>{pages.find((p) => p[0] === page)?.[1]}</h1>
              <p>
                Explore MODIS and VIIRS active-fire satellite observations.
                Observations are not unique fires.
              </p>
            </div>
            <div className="filterbar">
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <input
                aria-label="Select month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <button onClick={() => changeMonth(1)} aria-label="Next month">
                ›
              </button>
              <select
                aria-label="Sensor filter"
                value={sensor}
                onChange={(e) => setSensor(e.target.value)}
              >
                <option value="">All sensors</option>
                <option value="MODIS">MODIS</option>
                <option value="VIIRS">VIIRS</option>
              </select>
            </div>
          </div>
          {!configured && (
            <div className="notice">
              <Info size={18} /> Sample mode: add Supabase credentials to{" "}
              <code>.env</code>, apply SQL migration and import the supplied
              NASA FIRMS CSV files for real observations.
            </div>
          )}
          {error && <div className="error">Database error: {error}</div>}
          {loading && (
            <div className="loading">
              <RefreshCcw size={15} /> Loading observations…
            </div>
          )}
          <div className="metrics">
            <Metric
              label="OBSERVATIONS IN PERIOD"
              value={total.toLocaleString()}
              sub="Raw satellite detections"
            />
            <Metric
              label="MODIS (DISPLAYED)"
              value={modis.toLocaleString()}
              sub="Up to 1,500 rows fetched"
            />
            <Metric
              label="VIIRS (DISPLAYED)"
              value={viirs.toLocaleString()}
              sub="Up to 1,500 rows fetched"
            />
            <Metric
              label="ACTIVE DAYS"
              value={days}
              sub="Days with one or more observations"
            />
          </div>
          {page === "overview" && (
            <div className="columns">
              <section className="panel">
                <h2>
                  <MapPinned size={18} /> Observation map
                </h2>
                <p>
                  Showing up to 1,500 most recent observations in the selected
                  month.
                </p>
                <FireMap records={records} />
              </section>
              <section className="panel">
                <h2>
                  <CalendarDays size={18} /> Daily activity
                </h2>
                <p>Daily counts across the selected month.</p>
                <Calendar month={month} counts={counts} />
              </section>
            </div>
          )}
          {page === "map" && (
            <section className="panel">
              <h2>
                <Flame size={18} /> Satellite detections
              </h2>
              <p>
                Orange = MODIS, coral = VIIRS. Points are satellite
                observations, not confirmed fire incidents. The map is limited
                to 1,500 fetched rows.
              </p>
              <FireMap records={records} />
            </section>
          )}
          {page === "calendar" && (
            <section className="panel">
              <h2>
                <CalendarDays size={18} /> Burning activity calendar
              </h2>
              <p>
                Counts of observations per UTC acquisition date. Sensor coverage
                and overpasses affect these counts; they are not harmonized
                unique-fire counts.
              </p>
              <Calendar month={month} counts={counts} />
            </section>
          )}
          {page === "compare" && (
            <section className="panel">
              <h2>
                <GitCompareArrows size={18} /> MODIS vs VIIRS
              </h2>
              <p>
                Comparison of the fetched sample, not the complete
                selected-period population. For all-record counts, use the
                sensor filter above.
              </p>
              <div className="bars">
                {[
                  ["MODIS", modis],
                  ["VIIRS", viirs],
                ].map(([name, num]) => (
                  <div key={name}>
                    <div className="bar-label">
                      <b>{name}</b>
                      <span>{num.toLocaleString()}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${(num / Math.max(1, modis, viirs)) * 100}%`,
                          background: name === "MODIS" ? "#f8b46b" : "#f06555",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="notice">
                <ShieldCheck size={18} /> MODIS confidence is numeric (0–100);
                VIIRS confidence is categorical (low/nominal/high). These scales
                are not interchangeable. Proximity between detections alone does
                not prove a single fire.
              </div>
            </section>
          )}
          {page === "sources" && (
            <section className="panel">
              <h2>
                <Database size={18} /> Data sources and limitations
              </h2>
              <p>
                The included CSVs are from the supplied project archive and
                attributed to NASA FIRMS. This application does not
                automatically retrieve live NASA data.
              </p>
              <div className="source-grid">
                <div>
                  <b>MODIS Collection 6.1</b>
                  <span>Terra / Aqua · archive and NRT</span>
                </div>
                <div>
                  <b>VIIRS Collection 2</b>
                  <span>Suomi NPP and NOAA-21 · archive and NRT</span>
                </div>
                <div>
                  <b>Acquisition dates</b>
                  <span>UTC calendar days from FIRMS source rows</span>
                </div>
                <div>
                  <b>Harmonization status</b>
                  <span>
                    Combined schema and separate sensor labels; scientific
                    cross-sensor calibration not implemented
                  </span>
                </div>
              </div>
              <div className="notice">
                <Info size={18} /> The prototype supports observation mapping,
                date filtering and a daily activity calendar. Historical
                baseline anomalies, unique-fire clustering, live updates and
                validated sensor harmonization are future work.
              </div>
            </section>
          )}
          <footer>
            NASA Space Apps Challenge 2026 · TANAW research prototype · Source:
            NASA FIRMS · Not an operational emergency warning service.
          </footer>
        </div>
      </main>
    </div>
  );
}
