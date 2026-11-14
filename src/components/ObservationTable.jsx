
import React from 'react';

export default function ObservationTable({ observations = [] }) {
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
          {observations.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center' }}>
                No observations found for this date.
              </td>
            </tr>
          ) : (
            observations.map((observation) => (
              <tr key={observation.id}>
                <td>{observation.sensor ?? 'N/A'}</td>

                <td>{observation.satellite ?? 'N/A'}</td>

                <td>
                  {observation.latitude != null
                    ? Number(observation.latitude).toFixed(5)
                    : 'N/A'}
                </td>

                <td>
                  {observation.longitude != null
                    ? Number(observation.longitude).toFixed(5)
                    : 'N/A'}
                </td>

                <td>
                  {observation.frp != null
                    ? Number(observation.frp).toFixed(2)
                    : 'N/A'}
                </td>

                <td>{observation.confidence ?? 'N/A'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
