// Dashboard counts/reference calculations. Only Jan 1-Nov 14, 2026 is used.
import { TIMELINE_START, HISTORY_END, addDays, validTimelineDate } from './timeline-utils';
import { PHILIPPINES_BOUNDS } from './map-backgrounds';
import { validLocation } from './map-utils';
import { distanceKm } from './early-warning';

export const REFERENCE_START = TIMELINE_START;
export const REFERENCE_END = HISTORY_END;
export const STUDY_AREA_ID = 'philippines-map-extent';
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

export function dashboardArea(place, radiusKm = 10) {
  if (!place) return { id: STUDY_AREA_ID, label: 'Philippines map extent', type: 'extent' };
  return { id: place.key + ':' + radiusKm + 'km', label: place.title + ' - ' + radiusKm + ' km radius', type: 'radius', latitude: place.latitude, longitude: place.longitude, radiusKm };
}

export function inDashboardArea(record, area) {
  if (!validLocation(record.latitude, record.longitude)) return false;
  const lat = Number(record.latitude), lon = Number(record.longitude);
  if (lat < PHILIPPINES_BOUNDS[0][0] || lat > PHILIPPINES_BOUNDS[1][0] || lon < PHILIPPINES_BOUNDS[0][1] || lon > PHILIPPINES_BOUNDS[1][1]) return false;
  return area.type !== 'radius' || distanceKm(area.latitude, area.longitude, lat, lon) <= area.radiusKm;
}

export function validComparisonWindow(start, end) {
  return validTimelineDate(start) && validTimelineDate(end) && start >= REFERENCE_START && end <= REFERENCE_END && start <= end;
}

export function dateList(start, end) {
  const dates = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}

// Coverage describes complete source ingestion for this study extent, not cloud-free satellite coverage.
export function normalizeDashboardCoverage(data) {
  if (!data || data.area_id !== STUDY_AREA_ID || !Array.isArray(data.complete_ranges)) throw new Error('Dashboard coverage metadata has an invalid study area or complete_ranges.');
  for (const range of data.complete_ranges) {
    if (!['MODIS', 'VIIRS'].includes(range?.sensor) || !validTimelineDate(range.start) || !validTimelineDate(range.end) || range.start > range.end) throw new Error('Dashboard source coverage contains an invalid sensor/date range.');
  }
  return { source: typeof data.source === 'string' ? data.source : '', ranges: data.complete_ranges };
}

export function sourceCovers(ranges, sensor, start, end) {
  let cursor = start;
  const relevant = ranges.filter(range => range.sensor === sensor && range.end >= start && range.start <= end).sort((a, b) => a.start.localeCompare(b.start));
  for (const range of relevant) {
    if (range.start > cursor) return false;
    if (range.end >= end) return true;
    if (range.end >= cursor) cursor = addDays(range.end, 1);
  }
  return false;
}

export function referenceStatistic(values, method) {
  if (!values.length) return null;
  if (method === 'median') {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function referenceDifference(observed, expected, complete = true) {
  if (!complete || expected == null) return { count: null, percent: null };
  const difference = observed - expected;
  const count = Math.abs(difference) < 1e-9 ? 0 : difference;
  return { count, percent: expected === 0 ? null : count / expected * 100 };
}

export function calculateDashboard(records, area, ranges, sample, method, start, end) {
  const dates = dateList(REFERENCE_START, REFERENCE_END);
  const byDay = new Map(dates.map(date => [date, { date, MODIS: 0, VIIRS: 0, total: 0 }]));
  for (const record of records) {
    if (!record || record.kind === 'forecast' || !['MODIS', 'VIIRS'].includes(record.sensor) || !byDay.has(record.acq_date) || !inDashboardArea(record, area)) continue;
    const day = byDay.get(record.acq_date);
    day[record.sensor] += 1;
    day.total += 1;
  }
  const daily = [...byDay.values()];
  const completeFor = (sensor, from, to) => sample || sourceCovers(ranges, sensor, from, to);
  const reference = {};
  for (const sensor of ['MODIS', 'VIIRS', 'total']) {
    const complete = sensor === 'total' ? completeFor('MODIS', REFERENCE_START, REFERENCE_END) && completeFor('VIIRS', REFERENCE_START, REFERENCE_END) : completeFor(sensor, REFERENCE_START, REFERENCE_END);
    reference[sensor] = complete ? referenceStatistic(daily.map(day => day[sensor]), method) : null;
  }
  function summarize(days, from, to) {
    const counts = { MODIS: 0, VIIRS: 0, total: 0 };
    for (const day of days) { counts.MODIS += day.MODIS; counts.VIIRS += day.VIIRS; counts.total += day.total; }
    const complete = { MODIS: completeFor('MODIS', from, to), VIIRS: completeFor('VIIRS', from, to) };
    complete.total = complete.MODIS && complete.VIIRS;
    const expected = {};
    for (const sensor of ['MODIS', 'VIIRS', 'total']) expected[sensor] = reference[sensor] == null ? null : reference[sensor] * days.length;
    return { start: from, end: to, days: days.length, counts, complete, expected, difference: referenceDifference(counts.total, expected.total, complete.total) };
  }
  const months = MONTH_NAMES.map((label, index) => {
    const month = '2026-' + String(index + 1).padStart(2, '0');
    const days = daily.filter(day => day.date.startsWith(month));
    const result = summarize(days, days[0].date, days[days.length - 1].date);
    return { ...result, label, chartMODIS: result.complete.MODIS || result.counts.MODIS > 0 ? result.counts.MODIS : null, chartVIIRS: result.complete.VIIRS || result.counts.VIIRS > 0 ? result.counts.VIIRS : null };
  });
  const comparison = validComparisonWindow(start, end) ? summarize(daily.filter(day => day.date >= start && day.date <= end), start, end) : null;
  return { months, comparison, reference, referenceDays: daily.length, sample };
}
