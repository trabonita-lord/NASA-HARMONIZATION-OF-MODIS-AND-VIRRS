
import React from 'react';
import { getThemeColors } from '../theme';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ObservationPieChart({ observations = [] }) {
  const theme = getThemeColors();

  // Count actual MODIS and VIIRS observations.
  const modisCount = observations.filter(
    (observation) => observation.sensor === 'MODIS'
  ).length;

  const viirsCount = observations.filter(
    (observation) => observation.sensor === 'VIIRS'
  ).length;

  const total = modisCount + viirsCount;

  const chartData = {
    labels: ['MODIS', 'VIIRS'],
    datasets: [
      {
        label: 'Observations',
        data: [modisCount, viirsCount],
        backgroundColor: [
          theme.modis,
          theme.viirs,
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
      animateRotate: true,
      animateScale: true,
    },

    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme.text,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const count = context.parsed;
            const percentage = total > 0
              ? ((count / total) * 100).toFixed(1)
              : '0.0';

            return `${context.label}: ${count} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <section className="pie-chart-panel">
      <h3>Observation distribution</h3>

      {total === 0 ? (
        <p>No observations available for this date.</p>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 360,
            height: 280,
            margin: '20px auto',
          }}
        >
          <Pie
            data={chartData}
            options={chartOptions}
          />
        </div>
      )}
    </section>
  );
}