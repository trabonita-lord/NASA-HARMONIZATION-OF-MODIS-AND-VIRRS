// Edit the month arrows, month input, and sensor dropdown here.
import React from 'react';

export default function Filters({
  month,
  sensor,
  onMonthChange,
  onSensorChange,
  onChangeMonth,
}) {
  function showPreviousMonth() {
    onChangeMonth(-1);
  }

  function showNextMonth() {
    onChangeMonth(1);
  }

  function changeMonth(event) {
    onMonthChange(event.target.value);
  }

  function changeSensor(event) {
    onSensorChange(event.target.value);
  }

  return (
    <div className="filter-controls">
      <button
        onClick={showPreviousMonth}
        aria-label="Previous month"
      >
       <i className="fi fi-sr-angle-double-small-left"></i>
      </button>

      <input
        aria-label="Select month"
        type="month"
        value={month}
        onChange={changeMonth}
        className="month-input"
      />

      <button
        onClick={showNextMonth}
        aria-label="Next month"
      >
      <i className="fi fi-sr-angle-double-small-right"></i>
      </button>

      <select
        aria-label="Sensor filter"
        value={sensor}
        onChange={changeSensor}
      >
        <option value="">All sensors</option>
        <option value="MODIS">MODIS</option>
        <option value="VIIRS">VIIRS</option>
      </select>
    </div>
  );
}
