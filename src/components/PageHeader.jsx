// Edit the page heading and introduction here; filter controls are in Filters.jsx.
import React from 'react';
import Filters from './Filters';

export default function PageHeader({
  title,
  month,
  sensor,
  onMonthChange,
  onSensorChange,
  onChangeMonth,
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="section-caption">
          EARTH OBSERVATION Â· PHILIPPINES
        </div>

        <h1>{title}</h1>

        <p>
          Explore MODIS and VIIRS active-fire satellite observations.
          Observations are not unique fires.
        </p>
      </div>

      <Filters
        month={month}
        sensor={sensor}
        onMonthChange={onMonthChange}
        onSensorChange={onSensorChange}
        onChangeMonth={onChangeMonth}
      />
    </div>
  );
}
