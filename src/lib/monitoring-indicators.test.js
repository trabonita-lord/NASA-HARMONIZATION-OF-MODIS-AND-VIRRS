import { describe, it, expect } from 'vitest';
import { compareActivity, monitoringIndicators, freshness, precipitationSummary, MONITORING_CRITERIA } from './monitoring-indicators';
import { nearbyObservations, distanceKm, observationTime } from './early-warning';
const DAY = 86400000;
const asOf = Date.parse('2026-11-15T12:00:00Z');
const place = { latitude: 13.62, longitude: 123.19 };
const ranges = ['MODIS', 'VIIRS'].map(sensor => ({ sensor, start: '2026-10-01', end: '2026-11-15' }));
function observation(time, changes = {}) {
  const iso = new Date(time).toISOString();
  return { sensor: 'MODIS', ...place, acq_date: iso.slice(0, 10), acq_time: iso.slice(11, 16), ...changes };
}
const baseline = Array.from({ length: 28 }, (_, i) => observation(asOf - (i + 1.5) * DAY));
const compare = (records, options = {}) => compareActivity({ records, place, radius: 10, hours: 24, asOf, ranges, ...options });
describe('Detection activity comparison', () => {
  it('classifies elevated counts only with a real source-complete baseline', () => {
    const result = compare([...baseline, ...Array.from({length: 4}, (_, i) => observation(asOf - (i + 1) * 3600000))]);
    expect(result.mean).toBe(1); expect(result.windows).toBe(28);
    expect(result.classification).toBe('Higher-than-usual detected activity');
  });
  it('distinguishes typical counts and source-complete zero counts', () => {
    expect(compare([...baseline, observation(asOf - 3600000)]).classification).toBe('Typical detected activity');
    expect(compare(baseline).classification).toBe('No detected activity');
    expect(compare([]).mean).toBe(0);
    expect(compare(Array.from({length: 3}, () => observation(asOf - 3600000))).classification).toBe('Higher-than-usual detected activity');
  });
  it('withholds classification for missing sources, short reference, unavailable data and missing location', () => {
    for (const changes of [{ ranges: [] }, { ranges: [ranges[0]] }, { available: false }, { place: null }, { ranges: ranges.map(row => ({...row, start: '2026-11-12'})) }]) {
      expect(compare(baseline, changes).classification).toBe('Insufficient data');
    }
  });
  it('does not use old seasonal records, future timestamps, forecast records or distant observations', () => {
    const ignored = [observation(asOf - 60 * DAY), observation(asOf + 3600000), observation(asOf - 3600000, { latitude: 7, longitude: 125 }), observation(asOf - 3600000, { kind: 'forecast' }), observation(asOf - 3600000, { sensor: 'OTHER' })];
    const result = compare([...baseline, ...ignored]);
    expect(result.count).toBe(0); expect(result.mean).toBe(1);
  });
  it('excludes incomplete ingestion windows rather than interpreting them as zero counts', () => {
    const result = compare(baseline, { ranges: ranges.map(row => ({...row, start: '2026-11-01'})) });
    expect(result.windows).toBe(13); expect(result.mean).toBe(1);
  });
  it('withholds classification when local acquisition times cannot be counted reliably', () => {
    const result = compare([...baseline, observation(asOf - 3600000, { acq_time: null })]);
    expect(result.invalidTimes).toBe(1); expect(result.classification).toBe('Insufficient data');
  });
  it('uses nonoverlapping boundaries for recent/reference windows', () => {
    const result = compare([observation(asOf - DAY)]);
    expect(result.count).toBe(0); expect(result.mean).toBeCloseTo(1 / 28);
  });
});
describe('Geographic and timestamp filtering', () => {
  it('uses geodesic distance with a 10 km default search and valid UTC times', () => {
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
    const records = [observation(asOf - 3600000), observation(asOf - 3600000, { latitude: 14 }), observation(asOf - 3600000, { acq_time: '2561' }), observation(asOf + 3600000)];
    expect(nearbyObservations(records, place, 10, 24, asOf)).toHaveLength(1);
    expect(observationTime({ ...records[0], acq_date: '2026-02-30' })).toBeNull();
    expect(nearbyObservations(records, null, 10, 24, asOf)).toEqual([]);
  });
});
describe('Weather freshness and precipitation', () => {
  it('distinguishes recent, stale, missing and future timestamps', () => {
    expect(freshness(asOf - 3600000, asOf, 2)).toBe('Recent');
    expect(freshness(asOf - 3 * 3600000, asOf, 2)).toBe('Stale');
    expect(freshness(null, asOf, 2)).toBe('Unavailable');
    expect(freshness(asOf + 3600000, asOf, 2)).toBe('Future timestamp');
  });
  function daily(values) { return { time: values.map((_, i) => new Date(asOf - (i + 1) * DAY).toISOString().slice(0, 10)), precipitation_sum: values }; }
  it('counts consecutive completed UTC dry days ending yesterday, not today', () => {
    expect(precipitationSummary(daily([0, 0.5, 1, 0]), asOf)).toMatchObject({ dry_days: 2, rainfall_mm: 0, rainfall_date: '2026-11-14', dry_days_lower_bound: false });
    expect(precipitationSummary(daily([5]), asOf).dry_days).toBe(0);
    expect(precipitationSummary(daily(Array(14).fill(0)), asOf)).toMatchObject({ dry_days: 14, dry_days_lower_bound: true });
  });
  it('does not coerce missing rain into a dry day', () => {
    for (const values of [[null], ['0'], [-1], [0, null]]) expect(precipitationSummary(daily(values), asOf).dry_days).toBeNull();
  });
});
describe('Exploratory monitoring indicators', () => {
  const weather = { observedAt: asOf, temperature_c: 35, relative_humidity_pct: 30, wind_speed_kmh: 30, dry_days: 5 };
  const build = (changes = {}) => monitoringIndicators({ weather, asOf, temperatureReference: Array(20).fill(30), activity: compare(baseline), observationsAvailable: true, ...changes });
  it('explains configurable criteria without deriving a probability', () => {
    const result = build();
    expect(result.rows.slice(0, 4).map(row => row.flag)).toEqual([true, true, true, true]);
    expect(result.incomplete).toBe(false); expect(result.flagged).toBe(4);
    expect(build({ criteria: { ...MONITORING_CRITERIA, windMinKmh: 40 } }).rows[2].flag).toBe(false);
  });
  it('uses insufficient data for missing weather, stale weather, future weather and short temperature references', () => {
    for (const value of [null, {...weather, observedAt: asOf - DAY}, {...weather, observedAt: asOf + DAY}]) expect(build({weather: value}).rows.slice(0, 4).every(row => row.flag === null)).toBe(true);
    expect(build({ temperatureReference: [30, null] }).rows[0].flag).toBeNull();
    expect(build({weather: {...weather, relative_humidity_pct: null}}).rows[1].flag).toBeNull();
  });
  it('does not interpret unavailable satellite observations or coverage as reassuring', () => {
    expect(build({ observationsAvailable: false, activity: compare([], {available: false}) }).rows.slice(4).map(row => row.flag)).toEqual([null, null]);
    expect(build({activity: compare([], {ranges: []})}).rows[4].flag).toBeNull();
    expect(build({nearby: [observation(asOf)]}).rows[4].flag).toBe(true);
  });
});
