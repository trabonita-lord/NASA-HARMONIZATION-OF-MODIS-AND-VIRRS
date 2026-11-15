import React from 'react';
export const windMetrics = [
  ['wind_speed_10m_mean', 'Average daily wind speed', 'km/h'],
  ['wind_speed_hourly_max', 'Maximum hourly wind speed', 'km/h'],
  ['wind_gusts_10m_max', 'Maximum wind gust', 'km/h'],
];
export default function HistoricalWindSummary({ data }) {
  const bearing = data.wind_direction_deg;
  const hasDirection = Number.isFinite(bearing);
  return <section className="historical-wind" aria-label="Historical wind analysis">
    <h4>Historical wind / 10 m</h4>
    <dl className="daily-weather-metrics">{windMetrics.map(([field, label, unit]) => <div key={field}><dt>{label}</dt><dd>{Number.isFinite(data[field]) ? `${data[field].toFixed(1)} ${unit}` : 'Unavailable'}</dd></div>)}</dl>
    <div className="historical-wind-direction">
      <svg viewBox="0 0 120 120" className="wind-compass" role="img" aria-label={hasDirection ? `Wind from ${data.wind_direction_label}, ${bearing.toFixed(1)} degrees` : 'Wind direction unavailable: calm, variable, or missing measurements'}>
        <circle cx="60" cy="60" r="39" fill="none" stroke="currentColor" />
        <g fill="currentColor" textAnchor="middle" fontSize="12"><text x="60" y="14">N</text><text x="109" y="64">E</text><text x="60" y="116">S</text><text x="11" y="64">W</text></g>
        {hasDirection ? <g transform={`rotate(${bearing} 60 60)`} stroke="currentColor" fill="currentColor"><line x1="60" y1="79" x2="60" y2="33" strokeWidth="3" /><path d="M60 27 L54 39 L66 39 Z" /></g> : <text x="60" y="65" textAnchor="middle" fill="currentColor">—</text>}
      </svg>
      <p>Prevailing wind from: <strong>{hasDirection ? `${data.wind_direction_label} (${bearing.toFixed(1)}°)` : 'Unavailable (calm, variable, or missing data)'}</strong></p>
    </div>
    <p className="daily-weather-note">The compass points toward the direction the wind originates from (meteorological convention). Prevailing direction uses a speed-weighted vector average. This is historical weather context, not a validated prediction of fire spread.</p>
    <p className="daily-weather-note">Valid hourly samples: speed {data.wind_speed_hours ?? 0}/24; direction {data.wind_direction_hours ?? 0}/24 non-calm; calm {data.wind_calm_hours ?? 0}/24; gusts {data.wind_gust_hours ?? 0}/24. Statistics use available samples only; fewer than 24 samples means incomplete daily coverage.</p>
  </section>;
}
