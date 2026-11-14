// Edit the calendar page content here.
import React from 'react';
import { CalendarDays } from 'lucide-react';
import Calendar from './Calendar';

export default function CalendarPage({ month, counts, onSelectDate }) {
  return (
    <section className="page-panel">
      <h2>
        <CalendarDays size={18} /> Burning activity calendar
      </h2>

      <p>
        Counts of observations per UTC acquisition date. Sensor
        coverage and overpasses affect these counts; they are not
        harmonized unique-fire counts.
      </p>

      <Calendar
        month={month}
        counts={counts}
        onSelectDate={onSelectDate}
      />
    </section>
  );
}
