// Edit these three dates to change the map timeline limits.
export const TIMELINE_START = '2026-01-01';
export const HISTORY_END = '2026-11-14';
export const FORECAST_END = '2026-11-21';
const DAY_MS = 86400000;

export function validTimelineDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(date, amount) {
  return new Date(Date.parse(date + 'T00:00:00Z') + amount * DAY_MS).toISOString().slice(0, 10);
}

export function dayIndex(date) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(TIMELINE_START + 'T00:00:00Z')) / DAY_MS);
}

export function clampTimelineDate(date) {
  if (!validTimelineDate(date)) return HISTORY_END;
  if (date < TIMELINE_START) return TIMELINE_START;
  if (date > FORECAST_END) return FORECAST_END;
  return date;
}

export function timelineWindow(date, length = 1) {
  const end = clampTimelineDate(date);
  const days = [1, 3, 7].includes(Number(length)) ? Number(length) : 1;
  const start = addDays(end, 1 - days);
  return { start: start < TIMELINE_START ? TIMELINE_START : start, end };
}

export function nearbyDays(date) {
  let start = addDays(clampTimelineDate(date), -8);
  if (start < TIMELINE_START) start = TIMELINE_START;
  if (addDays(start, 16) > FORECAST_END) start = addDays(FORECAST_END, -16);
  return Array.from({ length: 17 }, (_, index) => addDays(start, index));
}

export function displayDate(date) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
