import React from 'react';
import { satelliteTemperatures, BRIGHTNESS_TEMPERATURE_NOTE } from '../lib/satellite-temperature';

export default function SatelliteTemperature({ observation }) {
  const readings = satelliteTemperatures(observation);
  if (!readings.length) return null;
  return (
    <div className="satellite-temperature">
      <dl>
        {readings.map(reading => (
          <div key={reading.field}>
            <dt>{reading.label}</dt>
            <dd>{reading.formatted}{reading.kelvin !== null && <> ({reading.kelvin} K)</>}</dd>
          </div>
        ))}
      </dl>
      <small>{BRIGHTNESS_TEMPERATURE_NOTE}</small>
    </div>
  );
}
