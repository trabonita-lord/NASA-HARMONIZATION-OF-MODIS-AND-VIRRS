// EDIT PIE CHART HERE: labels, sample values, colors, and chart options.
import React from 'react';
import { getThemeColors } from '../theme';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ObservationPieChart() {
  const theme = getThemeColors();
  // EDIT CHART DATA: Labels, sample values, and colors are in the same order.
  // Example: MODIS = 70 (amber), VIIRS = 150 (cyan). No backend is connected.
  const chartData = {
    labels: ['MODIS', 'VIIRS'],
    datasets: [
      {
        label: 'My First Dataset',
        data: [70, 150],
        backgroundColor: [
          theme.modis,
          theme.viirs,
        ],
      },
    ],
  };

  // EDIT CHART OPTIONS: Legend position and label color.
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    // LOADING TRANSITION: The slices rotate and grow into place.
    // Duration is in milliseconds: 1000 = one second.
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
    },
  };

  return (
    <section className="pie-chart-panel">
      <h3>Observation distribution</h3>

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
    </section>
  );
}
