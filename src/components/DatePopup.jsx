
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import ObservationPieChart from './ObservationPieChart';
import ObservationTable from './ObservationTable';

export default function DatePopup({ date, onClose, weather = null }) {
  const popupRef = useRef(null);

  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Open the popup.
  useEffect(() => {
    const popup = popupRef.current;
    const previouslyFocusedElement = document.activeElement;

    if (!popup.open) {
      popup.showModal();
    }

    return () => {
      if (popup.open) {
        popup.close();
      }

      previouslyFocusedElement?.focus?.();
    };
  }, []);

  // Fetch observations for the selected date.
  useEffect(() => {
    let cancelled = false;

    async function fetchObservations() {
      setLoading(true);
      setError(null);
      setObservations([]);

      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      try {
        const allObservations = [];
        const pageSize = 1000;
        let offset = 0;

        // Fetch all records, including days with over 1000 rows.
        while (true) {
          const { data, error: queryError } = await supabase
            .from('fire_observations')
            .select(
              'id, sensor, satellite, latitude, longitude, frp, confidence, acq_date'
            )
            .eq('acq_date', date)
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (queryError) {
            throw queryError;
          }

          if (cancelled) return;

          allObservations.push(...(data ?? []));

          if (!data || data.length < pageSize) {
            break;
          }

          offset += pageSize;
        }

        if (!cancelled) {
          setObservations(allObservations);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load observations.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchObservations();

    return () => {
      cancelled = true;
    };
  }, [date]);

  function handleEscape(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={popupRef}
      className="date-popup"
      aria-labelledby="date-dialog-title"
      onCancel={handleEscape}
    >
      <div className="date-popup-header">
        <div>
          <div className="section-caption">
            DAILY OBSERVATIONS / UTC
          </div>
          <h2 id="date-dialog-title">{date}</h2>
        </div>

        <button
          type="button"
          className="date-popup-close-button"
          onClick={onClose}
          aria-label="Close date details"
          autoFocus
        >
          <i
            className="fi fi-br-circle-xmark"
            aria-hidden="true"
          />
        </button>
      </div>

      <DailyWeatherSummary date={date} weather={weather} />

      {loading ? (
        <p>Loading observations...</p>
      ) : error ? (
        <p role="alert">
          Error loading observations: {error}
        </p>
      ) : (
        <>
          <ObservationPieChart observations={observations} />
          <ObservationTable observations={observations} />
        </>
      )}
    </dialog>
  );
}

function DailyWeatherSummary({ date, weather }) {
  const hasWeather = weather && typeof weather === 'object';
  const temperature = Number.isFinite(weather?.temperature_c)
    ? `${weather.temperature_c.toFixed(1)} °C`
    : '—';
  const condition = typeof weather?.condition === 'string' && weather.condition.trim()
    ? weather.condition
    : 'Not connected';
  const forecast = typeof weather?.forecast === 'string' && weather.forecast.trim()
    ? weather.forecast
    : 'Daily forecast will appear here when the weather data source is connected.';

  return (
    <section className="daily-weather-card" aria-labelledby="daily-weather-title">
      <div className="daily-weather-heading">
        <div>
          <div className="section-caption">WEATHER / {date} UTC</div>
          <h3 id="daily-weather-title">Daily weather</h3>
        </div>
        <span className={hasWeather ? 'daily-weather-status is-connected' : 'daily-weather-status'}>
          {hasWeather ? 'DATA CONNECTED' : 'AWAITING DATA'}
        </span>
      </div>
      <div className="daily-weather-details">
        <div className="daily-weather-temperature">
          <span>Temperature</span>
          <strong>{temperature}</strong>
          <small>{condition}</small>
        </div>
        <div className="daily-weather-forecast">
          <span>Forecast</span>
          <p>{forecast}</p>
        </div>
      </div>
      {!hasWeather && <p className="daily-weather-note">Connect this panel to your daily weather data using temperature_c, condition, and forecast fields.</p>}
    </section>
  );
}
