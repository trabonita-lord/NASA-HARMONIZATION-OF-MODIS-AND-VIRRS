
import React, { useEffect, useState } from 'react';
import { GitCompareArrows, ShieldCheck } from 'lucide-react';
import { loadHarmonizationSummary } from '../lib/harmonization';
import { satelliteTemperatures, formatCelsius, BRIGHTNESS_TEMPERATURE_NOTE } from '../lib/satellite-temperature';

export default function ComparisonPage({ modis, viirs, records = [] }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const result = await loadHarmonizationSummary();
        if (active) setSummary(result);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const largestCount = Math.max(1, modis, viirs);
  const modisWidth = (modis / largestCount) * 100;
  const viirsWidth = (viirs / largestCount) * 100;

  return (
    <section className="page-panel">
      <h2>
        <GitCompareArrows size={18} /> MODIS vs VIIRS
      </h2>

      <p>
        Comparison of the fetched sample, not the complete
        selected-period population. For all-record counts, use
        the sensor filter above.
      </p>

      <div className="sensor-comparison-bars">
        <div>
          <div className="sensor-comparison-label">
            <b>MODIS</b>
            <span>{modis.toLocaleString()}</span>
          </div>
          <div className="sensor-comparison-track">
            <div
              style={{
                width: modisWidth + '%',
                background: 'var(--sensor-modis)',
              }}
            />
          </div>
        </div>

        <div>
          <div className="sensor-comparison-label">
            <b>VIIRS</b>
            <span>{viirs.toLocaleString()}</span>
          </div>
          <div className="sensor-comparison-track">
            <div
              style={{
                width: viirsWidth + '%',
                background: 'var(--sensor-viirs)',
              }}
            />
          </div>
        </div>
      </div>

      <h3>Satellite brightness temperature ranges</h3>
      <p>Ranges cover valid readings in the fetched sample. Channels have different spectral responses; these are not matched-pair temperature differences.</p>
      <div className="observation-table-container">
        <table className="observation-table">
          <thead><tr><th scope="col">Measurement</th><th scope="col">Range (Celsius)</th><th scope="col">Valid readings</th></tr></thead>
          <tbody>{['MODIS', 'VIIRS'].flatMap(sensor => {
            const sensorRecords = records.filter(record => record.sensor === sensor);
            return satelliteTemperatures({ sensor }).map((channel, index) => {
              const values = sensorRecords.map(record => satelliteTemperatures(record)[index].celsius).filter(value => value !== null);
              const minimum = values.reduce((a, b) => Math.min(a, b), Infinity);
              const maximum = values.reduce((a, b) => Math.max(a, b), -Infinity);
              return <tr key={sensor + channel.field}><th scope="row">{channel.label}</th><td>{values.length ? `${formatCelsius(minimum)} to ${formatCelsius(maximum)}` : 'Not available'}</td><td>{values.length}</td></tr>;
            });
          })}</tbody>
        </table>
      </div>
      <p>{BRIGHTNESS_TEMPERATURE_NOTE}</p>

      <div className="info-message">
        <ShieldCheck size={18} />
        <span>
          MODIS confidence is numeric (0–100); VIIRS confidence
          is categorical (low/nominal/high). These scales are
          not interchangeable. Proximity between detections
          alone does not prove a single fire.
        </span>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2>
          <GitCompareArrows size={18} />
          {' '}MODIS–VIIRS Harmonization
        </h2>

        <p>
          Spatial-temporal candidate matching within 5 km
          and 60 minutes. Statistics cover the complete
          imported 2026 dataset, not just the selected month.
        </p>

        {loading && (
          <p role="status">Loading harmonization statistics...</p>
        )}

        {error && (
          <p role="alert">
            Unable to load harmonization data: {error}
          </p>
        )}

        {!loading && !error && summary && (
          <>
            <div className="summary-cards">
              <div className="summary-card">
                <span>CANDIDATE PAIRS</span>
                <strong>
                  {summary.totalMatches.toLocaleString()}
                </strong>
              </div>

              <div className="summary-card">
                <span>UNIQUE MODIS</span>
                <strong>
                  {summary.uniqueModis.toLocaleString()}
                </strong>
              </div>

              <div className="summary-card">
                <span>UNIQUE VIIRS</span>
                <strong>
                  {summary.uniqueViirs.toLocaleString()}
                </strong>
              </div>
            </div>

            <p>
              <strong>Average separation:</strong>{' '}
              {summary.averageDistanceKm.toFixed(3)} km
            </p>

            <p>
              <strong>Average time difference:</strong>{' '}
              {summary.averageTimeMinutes.toFixed(2)} minutes
            </p>

            <div className="info-message">
              <ShieldCheck size={18} />
              <span>
                Candidate pairs indicate observations that
                are close in space and time. They are not
                confirmed unique fires or validated detections
                of the same fire.
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
