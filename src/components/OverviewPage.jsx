// Edit the overview page content here.
import React from 'react';
import { MapPinned } from 'lucide-react';
import FireMap from './FireMap';

export default function OverviewPage({ records }) {
  return (
    <div className="overview-grid">
      <section className="page-panel map-panel">
        <h2>
          <MapPinned size={18} /> Observation map
        </h2>

        <p>
          Showing up to 1,500 most recent observations in the
          selected month.
        </p>

        <FireMap records={records} />
      </section>

    </div>
  );
}
