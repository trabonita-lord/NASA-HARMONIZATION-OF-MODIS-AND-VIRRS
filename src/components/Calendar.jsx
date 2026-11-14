// Calendar dates are built below, then shown in the return section.
import React from 'react';

export default function Calendar({ month, counts, onSelectDate }) {
  const monthParts = month.split('-');
  const year = Number(monthParts[0]);
  const monthNumber = Number(monthParts[1]);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const numberOfDays = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  let highestCount = 1;
  for (const date in counts) {
    if (counts[date] > highestCount) {
      highestCount = counts[date];
    }
  }

  // 1. Empty spaces before the first date.
  const emptyCells = [];
  for (let index = 0; index < firstWeekday; index = index + 1) {
    emptyCells.push(<div key={'empty-' + index} />);
  }

  // 2. One button for each date in the month.
  const dateButtons = [];
  for (let day = 1; day <= numberOfDays; day = day + 1) {
    let dayText = String(day);
    if (day < 10) {
      dayText = '0' + day;
    }
    const date = month + '-' + dayText;
    const count = counts[date] || 0;

    let backgroundColor;
    if (count > 0) {
      const opacity = 0.1 + (0.7 * count) / highestCount;
      backgroundColor = 'rgba(255,87,34,' + opacity + ')';
    }

    function openThisDate() {
      onSelectDate(date);
    }

    dateButtons.push(
      <button
        key={date}
        type="button"
        className="calendar-day"
        style={{ background: backgroundColor }}
        onClick={openThisDate}
        aria-haspopup="dialog"
        aria-label={date + ': ' + count.toLocaleString() + ' observations. View details'}
      >
        <span>{day}</span>
        <b>{count.toLocaleString()}</b>
      </button>
    );
  }

  // 3. Visible calendar layout.
  return (
    <div className="calendar-grid">
      <div className="calendar-weekday">Sun</div>
      <div className="calendar-weekday">Mon</div>
      <div className="calendar-weekday">Tue</div>
      <div className="calendar-weekday">Wed</div>
      <div className="calendar-weekday">Thu</div>
      <div className="calendar-weekday">Fri</div>
      <div className="calendar-weekday">Sat</div>
      {emptyCells}
      {dateButtons}
    </div>
  );
}
