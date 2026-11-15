
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CloudSun, RefreshCcw } from 'lucide-react';

import { fetchHistoricalWeather } from '../lib/open-meteo-history';
import {
  fireObservationTimestamp,
  matchHistoricalWeather,
} from '../lib/historical-fire-weather';

const MAX_OPTIONS = 100;

function validObservation(record) {
  if (!record || typeof record !== 'object') return false;

  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  return (
    record.latitude != null &&
    record.longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    fireObservationTimestamp(record) != null
  );
}

function dateRange(date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);

  return {
    startDate: new Date(timestamp - 86400000)
      .toISOString()
      .slice(0, 10),
    endDate: new Date(timestamp + 86400000)
      .toISOString()
      .slice(0, 10),
  };
}

function displayNumber(value, unit = '', digits = 1) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(digits)}${unit}`
    : 'Unavailable';
}

export default function HistoricalWeatherExplorer({
  records = [],
  sample = false,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef(null);

  const observations = useMemo(
    () => records.filter(validObservation).slice(0, MAX_OPTIONS),
    [records]
  );

  const observation = observations[selectedIndex] ?? null;

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSelectedIndex(0);
    setResult(null);
    setError('');
    setLoading(false);

    return () => {
      controllerRef.current?.abort();
    };
  }, [records]);

  function selectObservation(event) {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setSelectedIndex(Number(event.target.value));
    setResult(null);
    setError('');
    setLoading(false);
  }

  async function loadWeather() {
    if (!observation || loading) return;

    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const dates = dateRange(observation.acq_date);

      const weatherRecords = await fetchHistoricalWeather({
        latitude: Number(observation.latitude),
        longitude: Number(observation.longitude),
        startDate: dates.startDate,
        endDate: dates.endDate,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      const matched = matchHistoricalWeather(
        observation,
        weatherRecords
      );

      if (!matched) {
        setError(
          'No historical weather record met the configured time and distance limits.'
        );
        return;
      }

      setResult({
        observation,
        weather: matched,
      });
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Historical weather could not be loaded.'
        );
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <section
      className="dashboard-card"
      aria-label="Historical weather explorer"
      style={{ padding: '1.5rem', marginTop: '1.5rem' }}
    >
      <div className="dashboard-card-heading">
        <h2>
          <CloudSun size={18} />
          Historical Weather Explorer
        </h2>
      </div>

      <p className="dashboard-note">
        Inspect estimated historical weather near a satellite fire
        observation. Weather is requested only when you click the
        button. Results are not fire predictions.
      </p>

      {sample && (
        <p className="dashboard-message dashboard-sample">
          Sample observations do not include acquisition times.
          Historical weather matching requires a real observation
          with a valid UTC acquisition time.
        </p>
      )}

      {!sample && observations.length === 0 && (
        <p className="dashboard-message">
          No observations with valid coordinates and acquisition
          timestamps are currently available.
        </p>
      )}

      {observations.length > 0 && (
        <>
          <div
            className="dashboard-filters"
            style={{ marginTop: '1rem' }}
          >
            <label>
              Select satellite observation
              <select
                aria-label="Select fire observation for historical weather"
                value={selectedIndex}
                onChange={selectObservation}
              >
                {observations.map((record, index) => (
                  <option
                    key={`${record.id ?? 'record'}-${index}`}
                    value={index}
                  >
                    {record.sensor ?? 'Satellite'} ·{' '}
                    {record.acq_date} ·{' '}
                    {String(record.acq_time).padStart(4, '0')} UTC ·{' '}
                    {Number(record.latitude).toFixed(3)},{' '}
                    {Number(record.longitude).toFixed(3)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="dashboard-note">
            Showing up to {MAX_OPTIONS} eligible observations
            from the currently loaded dataset.
          </p>

          <button
            type="button"
            className="dashboard-secondary-button"
            onClick={loadWeather}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            <RefreshCcw size={14} />
            {loading
              ? 'Loading historical weather...'
              : 'Fetch historical weather'}
          </button>
        </>
      )}

      {loading && (
        <p className="dashboard-message" role="status">
          Requesting historical weather from Open-Meteo...
        </p>
      )}

      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div
          className="dashboard-reference-card"
          style={{ marginTop: '1.25rem' }}
        >
          <div>
            <span className="dashboard-eyebrow">
              HISTORICAL WEATHER MATCH
            </span>

            <h2>
              {result.observation.sensor ?? 'Satellite'} Observation
            </h2>

            <p>
              Fire acquisition:{' '}
              <b>
                {new Date(
                  fireObservationTimestamp(result.observation)
                ).toISOString()}
              </b>
            </p>

            <p>
              Matched weather time:{' '}
              <b>{result.weather.weather_timestamp}</b>
            </p>

            <p>
              Temperature:{' '}
              <b>
                {displayNumber(
                  result.weather.temperature_c,
                  ' °C'
                )}
              </b>
            </p>

            <p>
              Relative humidity:{' '}
              <b>
                {displayNumber(
                  result.weather.relative_humidity_pct,
                  '%',
                  0
                )}
              </b>
            </p>

            <p>
              Wind speed:{' '}
              <b>
                {displayNumber(
                  result.weather.wind_speed_kmh,
                  ' km/h'
                )}
              </b>
            </p>

            <p>
              Wind direction:{' '}
              <b>
                {displayNumber(
                  result.weather.wind_direction_deg,
                  '°',
                  0
                )}
              </b>
            </p>

            <p>
              Weather grid distance:{' '}
              <b>
                {displayNumber(
                  result.weather.distance_km,
                  ' km',
                  2
                )}
              </b>
            </p>

            <p>
              Time difference:{' '}
              <b>
                {displayNumber(
                  result.weather.time_difference_hours,
                  ' hours',
                  2
                )}
              </b>
            </p>

            <p className="dashboard-note">
              Source: {result.weather.provider}.
              These are historical gridded weather estimates,
              not direct measurements at the fire location.
              Weather matching does not establish fire causation
              or predict fire spread.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
