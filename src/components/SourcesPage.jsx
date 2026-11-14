// Edit the sources page content here.
import React from 'react';
import { Database, Info } from 'lucide-react';

export default function SourcesPage() {
  return (
    <section className="page-panel">
      <h2>
        <Database size={18} /> Data sources and limitations
      </h2>

      <p>
        The included CSVs are from the supplied project archive
        and attributed to NASA FIRMS. This application does not
        automatically retrieve live NASA data.
      </p>

      <div className="data-source-cards">
        <div>
          <b>MODIS Collection 6.1</b>
          <span>Terra / Aqua Â· archive and NRT</span>
        </div>

        <div>
          <b>VIIRS Collection 2</b>
          <span>Suomi NPP and NOAA-21 Â· archive and NRT</span>
        </div>

        <div>
          <b>Acquisition dates</b>
          <span>UTC calendar days from FIRMS source rows</span>
        </div>

        <div>
          <b>Harmonization status</b>
          <span>
            Combined schema and separate sensor labels;
            scientific cross-sensor calibration not implemented
          </span>
        </div>
      </div>

      <div className="info-message">
        <Info size={18} /> The prototype supports observation
        mapping, date filtering and a daily activity calendar.
        Historical baseline anomalies, unique-fire clustering,
        live updates and validated sensor harmonization are
        future work.
      </div>
    </section>
  );
}
