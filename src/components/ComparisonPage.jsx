// Edit the compare page content here.
import React from 'react';
import { GitCompareArrows, ShieldCheck } from 'lucide-react';

export default function ComparisonPage({ modis, viirs }) {
  // Compare both bars against the larger observation count.
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
        {/* MODIS BAR: Edit its label and color here. */}
        <div>
          <div className="sensor-comparison-label">
            <b>MODIS</b>
            <span>{modis.toLocaleString()}</span>
          </div>
          <div className="sensor-comparison-track">
            <div style={{ width: modisWidth + '%', background: 'var(--sensor-modis)' }} />
          </div>
        </div>

        {/* VIIRS BAR: Edit its label and color here. */}
        <div>
          <div className="sensor-comparison-label">
            <b>VIIRS</b>
            <span>{viirs.toLocaleString()}</span>
          </div>
          <div className="sensor-comparison-track">
            <div style={{ width: viirsWidth + '%', background: 'var(--sensor-viirs)' }} />
          </div>
        </div>
      </div>

      <div className="info-message">
        <ShieldCheck size={18} /> MODIS confidence is numeric
        (0â€“100); VIIRS confidence is categorical
        (low/nominal/high). These scales are not interchangeable.
        Proximity between detections alone does not prove a
        single fire.
      </div>
    </section>
  );
}
