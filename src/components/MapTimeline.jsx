// MAP TIMELINE: Different design from FIRMS; all dates and controls use UTC.
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X, Clock3, RotateCcw } from 'lucide-react';
import {
  TIMELINE_START, HISTORY_END, FORECAST_END, addDays, dayIndex,
  displayDate, nearbyDays, validTimelineDate,
} from '../lib/timeline-utils';
import './map-timeline.css';

export default function MapTimeline({ date, windowDays, data, onDateChange, onWindowChange, onClose, onRetry }) {
  const [playing, setPlaying] = useState(false);
  const dayStrip = useRef(null);
  const selectedDay = useRef(null);

  useEffect(function keepSelectedDayVisible() {
    if (dayStrip.current && selectedDay.current) {
      dayStrip.current.scrollLeft = Math.max(0, selectedDay.current.offsetLeft - (dayStrip.current.clientWidth - selectedDay.current.offsetWidth) / 2);
    }
  }, [date]);
  const future = date > HISTORY_END;
  const predicted = data.records.filter(record => record.kind === 'forecast').length;
  const observed = data.records.length - predicted;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  useEffect(function playNextDay() {
    if (!playing) return;
    if (date === FORECAST_END || data.error) { setPlaying(false); return; }
    if (data.loading) return;
    const timer = setTimeout(() => onDateChange(addDays(date, 1)), 1000);
    return function stopPlaybackTimer() { clearTimeout(timer); };
  }, [playing, date, data.loading, data.error, onDateChange]);

  function chooseDate(value) {
    if (!validTimelineDate(value)) return;
    setPlaying(false);
    onDateChange(value);
  }

  function togglePlayback() {
    if (!playing && date === FORECAST_END) onDateChange(TIMELINE_START);
    setPlaying(!playing);
  }

  return (
    <section className="map-timeline" aria-label="Map observation and forecast timeline">
      <div className="timeline-heading">
        <div className="timeline-title"><Clock3 size={16} /><b>HOTSPOT TIMELINE</b><span className={future ? 'timeline-badge forecast-badge' : 'timeline-badge'}>{future ? 'FORECAST RANGE' : data.sample ? 'SAMPLE HISTORY' : 'OBSERVED RANGE'}</span></div>
        <button type="button" className="timeline-icon-button" aria-label="Close timeline" onClick={onClose}><X size={17} /></button>
      </div>
      <div className="timeline-controls">
        <div className="timeline-playback">
          <button type="button" className="timeline-icon-button" aria-label="Previous timeline day" disabled={date === TIMELINE_START} onClick={() => chooseDate(addDays(date, -1))}><ChevronLeft size={18} /></button>
          <button type="button" className="timeline-play-button" aria-label={playing ? 'Pause timeline' : 'Play timeline'} disabled={Boolean(data.error)} onClick={togglePlayback}>{playing ? <Pause size={16} /> : <Play size={16} />}<span>{playing ? 'Pause' : 'Play'}</span></button>
          <button type="button" className="timeline-icon-button" aria-label="Next timeline day" disabled={date === FORECAST_END} onClick={() => chooseDate(addDays(date, 1))}><ChevronRight size={18} /></button>
        </div>
        <label className="timeline-date-label">Selected day <input type="date" aria-label="Timeline selected date" min={TIMELINE_START} max={FORECAST_END} value={date} onChange={event => chooseDate(event.target.value)} /></label>
        <label className="timeline-window-label">Map window <select aria-label="Timeline observation window" value={windowDays} onChange={event => { setPlaying(false); onWindowChange(Number(event.target.value)); }}><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option></select></label>
        <button type="button" className="timeline-forecast-jump" onClick={() => chooseDate(addDays(HISTORY_END, 1))}>Forecast +7 days <ChevronRight size={14} /></button>
      </div>
      <div className="timeline-months" aria-label="Jump to month">
        {months.map((month, index) => { const value = '2026-' + String(index + 1).padStart(2, '0') + '-01'; return <button type="button" key={month} aria-label={'Jump to ' + month + ' 2026'} aria-pressed={date.slice(0, 7) === value.slice(0, 7)} onClick={() => chooseDate(value)}>{month}</button>; })}
      </div>
      <div ref={dayStrip} className="timeline-days" aria-label="Select a timeline day">
        {nearbyDays(date).map(day => <button type="button" key={day} ref={day === date ? selectedDay : null} className={day > HISTORY_END ? 'timeline-forecast-day' : ''} aria-label={displayDate(day) + (day > HISTORY_END ? ' forecast' : ' historical')} aria-pressed={date === day} onClick={() => chooseDate(day)}><small>{displayDate(day).slice(3, 6)}</small><b>{day.slice(8)}</b>{day > HISTORY_END && <i aria-hidden="true" />}</button>)}
      </div>
      <input type="range" className="timeline-range" aria-label="Scrub timeline date" min={0} max={dayIndex(FORECAST_END)} step={1} value={dayIndex(date)} onChange={event => chooseDate(addDays(TIMELINE_START, Number(event.target.value)))} />
      <div className="timeline-status" role="status" aria-live="polite">
        <span>{displayDate(data.period.start)}{data.period.start !== data.period.end && ' - ' + displayDate(data.period.end)} <small>UTC</small></span>
        <span>{data.loading ? 'Loading map...' : data.error ? <><span>{data.error}</span><button type="button" onClick={onRetry}><RotateCcw size={12} />Retry</button></> : <>{observed} observations{data.sample ? ' (sample)' : ''} · {predicted} predictions{data.period.end > HISTORY_END && !data.forecastConnected && <b className="timeline-empty-forecast">No forecast data connected</b>}</>}</span>
      </div>
      <div className="timeline-key"><span><i />History: Jan 1 - Nov 14, 2026</span><span><i />Forecast: Nov 15 - 21, 2026</span></div>
    </section>
  );
}
