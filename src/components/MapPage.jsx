// Edit the map page content here.
import React from 'react';
import { Flame } from 'lucide-react';
import FireMap from './FireMap';

export default function MapPage({ records }) {
  return (
    <section className="page-panel map-panel">
      <h2>
        <Flame size={18} /> Satellite detections
      </h2>

      <p>
        Amber = MODIS, cyan = VIIRS. Points are satellite
        observations, not confirmed fire incidents. The map is
        limited to 1,500 fetched rows.
      </p>

      <FireMap records={records} />
    </section>
  );
}
