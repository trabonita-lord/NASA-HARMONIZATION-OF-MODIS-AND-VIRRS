import { nearbyObservations, distanceKm, observationTime } from './early-warning';
import { sourceCovers } from './dashboard-statistics';

const DAY = 86400000;
export const MONITORING_CRITERIA = Object.freeze({
  humidityMax: 30, windMinKmh: 30, dryDayRainMaxMm: 1, dryDaysMin: 5,
  weatherMaxAgeHours: 2, satelliteMaxAgeHours: 48,
  temperaturePercentile: 0.9, temperatureMinSamples: 20,
  baselineDays: 28, baselineMinWindows: 7, activityRatio: 2, activityMinExcess: 3,
});
export const utcDate = time => new Date(time).toISOString().slice(0, 10);
export function freshness(timestamp, asOf, maxHours) {
  if (!Number.isFinite(timestamp)) return 'Unavailable';
  if (timestamp > asOf + 300000) return 'Future timestamp';
  return asOf - timestamp > maxHours * 3600000 ? 'Stale' : 'Recent';
}
export function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}
export function precipitationSummary(daily, asOf, criteria = MONITORING_CRITERIA) {
  const dates = Array.isArray(daily?.time) ? daily.time : [];
  const rainfall = new Map(dates.map((date, i) => [date, daily.precipitation_sum?.[i]]));
  let dryDays = 0, complete = true, bounded = false;
  for (let offset = 1; offset <= 14; offset++) {
    const value = rainfall.get(utcDate(asOf - offset * DAY));
    if (!Number.isFinite(value) || value < 0) { complete = false; break; }
    if (value >= criteria.dryDayRainMaxMm) { bounded = true; break; }
    dryDays++;
  }
  const rain = rainfall.get(utcDate(asOf - DAY));
  return { rainfall_mm: Number.isFinite(rain) && rain >= 0 ? rain : null,
    rainfall_date: utcDate(asOf - DAY), dry_days: complete ? dryDays : null,
    dry_days_lower_bound: !bounded && dryDays > 0, dry_days_observed: dryDays };
}

// Equal-duration, nonoverlapping prior windows from the same area and recent season.
// Complete source ingestion is required for BOTH sensors, including zero-count windows.
export function compareActivity({ records, place, radius, hours, asOf, ranges = [], available = true, criteria = MONITORING_CRITERIA }) {
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(asOf)) return { classification: 'Insufficient data', count: 0, mean: null, windows: 0, completeRecent: false, invalidTimes: 0, sufficient: false };
  const recent = nearbyObservations(records, place, radius, hours, asOf).filter(row => row.observedAt > asOf - hours * 3600000 && ['MODIS', 'VIIRS'].includes(row.sensor));
  const covered = (start, end) => ['MODIS', 'VIIRS'].every(sensor => sourceCovers(ranges, sensor, utcDate(start), utcDate(end)));
  const end = asOf - hours * 3600000;
  const values = [];
  for (let cursor = end; cursor - hours * 3600000 >= end - criteria.baselineDays * DAY; cursor -= hours * 3600000) {
    const start = cursor - hours * 3600000;
    if (covered(start, cursor)) {
      const count = nearbyObservations(records, place, radius, hours, cursor)
        .filter(row => row.observedAt > start && ['MODIS', 'VIIRS'].includes(row.sensor)).length;
      values.push(count);
    }
  }
  const completeRecent = covered(asOf - hours * 3600000, asOf);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const invalidTimes = place ? records.filter(row => ['MODIS', 'VIIRS'].includes(row.sensor) &&
    row.kind !== 'forecast' && observationTime(row) === null &&
    row.acq_date >= utcDate(end - criteria.baselineDays * DAY) && row.acq_date <= utcDate(asOf) &&
    row.latitude != null && row.longitude != null &&
    distanceKm(place.latitude, place.longitude, Number(row.latitude), Number(row.longitude)) <= radius).length : 0;
  const sufficient = !!place && available && completeRecent && values.length >= criteria.baselineMinWindows && invalidTimes === 0;
  let classification = 'Insufficient data';
  if (sufficient) classification = recent.length === 0 ? 'No detected activity' :
    recent.length >= mean * criteria.activityRatio && recent.length - mean >= criteria.activityMinExcess
      ? 'Higher-than-usual detected activity' : 'Typical detected activity';
  return { classification, count: recent.length, mean, windows: values.length, completeRecent, invalidTimes, sufficient };
}
export function monitoringIndicators({ weather, temperatureReference = [], activity, nearby = [], observationsAvailable, asOf, criteria = MONITORING_CRITERIA }) {
  const fresh = freshness(weather?.observedAt, asOf, criteria.weatherMaxAgeHours) === 'Recent';
  const reference = temperatureReference.filter(Number.isFinite);
  const cutoff = reference.length >= criteria.temperatureMinSamples ? percentile(reference, criteria.temperaturePercentile) : null;
  const check = (value, predicate) => fresh && Number.isFinite(value) ? predicate(value) : null;
  const rows = [
    { title: 'Temperature above local reference', flag: cutoff === null ? null : check(weather?.temperature_c, value => value > cutoff), detail: cutoff === null ? `Needs at least ${criteria.temperatureMinSamples} historical samples.` : `Current temperature > ${cutoff.toFixed(1)} °C (${(criteria.temperaturePercentile * 100).toFixed(0)}th percentile of ${reference.length} same-UTC-hour samples).` },
    { title: 'Low relative humidity', flag: check(weather?.relative_humidity_pct, value => value <= criteria.humidityMax), detail: `Relative humidity ≤ ${criteria.humidityMax}%.` },
    { title: 'Strong wind', flag: check(weather?.wind_speed_kmh, value => value >= criteria.windMinKmh), detail: `Wind speed ≥ ${criteria.windMinKmh} km/h.` },
    { title: 'Extended dry period', flag: check(weather?.dry_days, value => value >= criteria.dryDaysMin), detail: `At least ${criteria.dryDaysMin} consecutive completed UTC days with precipitation < ${criteria.dryDayRainMaxMm} mm/day.` },
    { title: 'Recent nearby detections', flag: observationsAvailable ? nearby.length > 0 ? true : activity?.completeRecent && !activity?.invalidTimes ? false : null : null, detail: 'MODIS/VIIRS observations within the selected radius and time window.' },
    { title: 'Unusual detected activity', flag: activity?.sufficient ? activity.classification === 'Higher-than-usual detected activity' : null, detail: `Count ≥ ${criteria.activityRatio}× reference mean and ≥ ${criteria.activityMinExcess} observations above it; at least ${criteria.baselineMinWindows} source-complete reference windows.` },
  ];
  return { rows, incomplete: rows.some(row => row.flag === null), flagged: rows.filter(row => row.flag === true).length };
}
