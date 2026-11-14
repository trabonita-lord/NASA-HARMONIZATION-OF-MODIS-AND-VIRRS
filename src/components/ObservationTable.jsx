// Edit popup table headings here. Rows stay empty for a future backend.
import React from 'react';

export default function ObservationTable() {
  return (
    <div
      className="observation-table-container"
      tabIndex={0}
      role="region"
      aria-label="Daily observations table"
    >
      <table className="observation-table">
        <thead>
          <tr>
            <th scope="col">Sensor</th>
            <th scope="col">Satellite</th>
            <th scope="col">Latitude</th>
            <th scope="col">Longitude</th>
            <th scope="col">FRP (MW)</th>
            <th scope="col">Confidence</th>
          </tr>
        </thead>

        <tbody>
          {/* Add observation rows here later. */}
        </tbody>
      </table>
    </div>
  );
}
