// Charts use the shared MODIS amber / VIIRS cyan theme colors.
import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { getThemeColors } from '../theme';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export default function DashboardCharts({ months, method, sample }) {
  const theme = getThemeColors();
  const modis = theme.modis || '#FFB74D';
  const viirs = theme.viirs || '#00E5FF';
  const referenceName = method === 'median' ? 'median daily reference' : 'average daily reference';
  const labels = months.map(month => month.label);
  const observed = [
    { label: 'MODIS' + (sample ? ' (sample)' : ''), data: months.map(month => month.chartMODIS), backgroundColor: modis, borderColor: modis },
    { label: 'VIIRS' + (sample ? ' (sample)' : ''), data: months.map(month => month.chartVIIRS), backgroundColor: viirs, borderColor: viirs },
  ];
  const options = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { color: '#9EB4C7', font: { size: 10 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#9EB4C7', precision: 0, font: { size: 10 } }, grid: { color: 'rgba(150,180,210,.1)' }, title: { display: true, text: 'Satellite observations', color: '#9EB4C7', font: { size: 10 } } },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: theme.text || '#EAF2FA', boxWidth: 12, font: { size: 10 } } },
      tooltip: { callbacks: { label: context => context.dataset.label + ': ' + (Number.isFinite(context.parsed.y) ? context.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'Unavailable') } },
    },
  };
  const lineData = {
    labels,
    datasets: [
      ...observed.map(dataset => ({ ...dataset, borderWidth: 2, pointRadius: 3, tension: 0.15, spanGaps: false })),
      { label: 'MODIS ' + referenceName, data: months.map(month => month.expected.MODIS), borderColor: modis, backgroundColor: modis, borderDash: [5, 5], borderWidth: 1, pointRadius: 0, spanGaps: false },
      { label: 'VIIRS ' + referenceName, data: months.map(month => month.expected.VIIRS), borderColor: viirs, backgroundColor: viirs, borderDash: [5, 5], borderWidth: 1, pointRadius: 0, spanGaps: false },
    ],
  };
  const hasValues = months.some(month => month.chartMODIS != null || month.chartVIIRS != null);
  return (
    <div className="dashboard-chart-grid">
      <section className="dashboard-card"><div className="dashboard-card-heading"><h2>Monthly MODIS vs VIIRS</h2><span>2026 · grouped bars</span></div><p>January 1-November 14. November includes only days 1-14.</p><div className="dashboard-chart"><Bar data={{ labels, datasets: observed }} options={options} role="img" aria-label="Monthly MODIS and VIIRS observation counts" />{!hasValues && <div className="dashboard-chart-empty">No observations loaded for this area.</div>}</div></section>
      <section className="dashboard-card"><div className="dashboard-card-heading"><h2>Observation time series</h2><span>Monthly · different sensor colors</span></div><p>Solid lines show loaded observations. Dashed lines show the daily reference scaled to each month's displayed days.</p><div className="dashboard-chart"><Line data={lineData} options={options} role="img" aria-label="MODIS amber and VIIRS cyan monthly time series with reference lines" />{!hasValues && <div className="dashboard-chart-empty">No observations loaded for this area.</div>}</div></section>
    </div>
  );
}
