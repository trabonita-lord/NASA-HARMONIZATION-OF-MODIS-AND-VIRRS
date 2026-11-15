import { describe, it, expect } from 'vitest';
import { compassDirection, summarizeHourlyWind } from './historical-wind';
const date = '2020-10-01';
function summarize(speeds, directions, gusts) {
  return summarizeHourlyWind({ time: speeds.map((_, i) => `${date}T${String(i).padStart(2, '0')}:00`), wind_speed_10m: speeds, wind_direction_10m: directions, wind_gusts_10m: gusts }, date);
}
describe('Historical wind circular statistics', () => {
  it('averages across north instead of averaging degrees', () => {
    const result = summarize([10, 10], [350, 10], [20, 30]);
    expect(Math.min(result.wind_direction_deg, 360 - result.wind_direction_deg)).toBeCloseTo(0);
    expect(result.wind_direction_label).toBe('N');
    expect(result.wind_speed_10m_mean).toBe(10);
    expect(result.wind_gusts_10m_max).toBe(30);
  });
  it('weights bearings by speed while keeping the scalar speed average', () => {
    const result = summarize([10, 30], [0, 90]);
    expect(result.wind_direction_deg).toBeCloseTo(71.565);
    expect(result.wind_direction_label).toBe('E');
    expect(result.wind_speed_10m_mean).toBe(20);
    expect(result.wind_speed_hourly_max).toBe(30);
  });
  it('does not invent a bearing for opposing or calm winds', () => {
    expect(summarize([10, 10], [90, 270]).wind_direction_deg).toBeNull();
    const calm = summarize([0, 0], [0, 180]);
    expect(calm.wind_speed_10m_mean).toBe(0);
    expect(calm.wind_calm_hours).toBe(2);
    expect(calm.wind_direction_deg).toBeNull();
  });
  it('ignores missing, invalid, and negative measurements without coercing them', () => {
    const result = summarize([10, null, -1, '20', 20, Infinity], [null, 0, 0, 0, 361, 90], [null, -1, '30', Infinity, 0]);
    expect(result.wind_speed_hours).toBe(2);
    expect(result.wind_direction_hours).toBe(0);
    expect(result.wind_direction_deg).toBeNull();
    expect(result.wind_gusts_10m_max).toBe(0);
    expect(summarizeHourlyWind(null, date).wind_speed_10m_mean).toBeNull();
  });
  it('filters other dates, malformed timestamps, and duplicate hours', () => {
    const result = summarizeHourlyWind({ time: [`${date}T00:00`, `${date}T00:00`, '2020-10-02T00:00', `${date}T25:00`], wind_speed_10m: [10, 100, 100, 100], wind_direction_10m: [180, 0, 0, 0] }, date);
    expect(result.wind_speed_hours).toBe(1); expect(result.wind_direction_label).toBe('S');
  });
  it('maps all eight compass sectors and boundary bearings', () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315, 360].map(compassDirection)).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']);
    expect(compassDirection(22.49)).toBe('N'); expect(compassDirection(22.5)).toBe('NE');
    expect(compassDirection(null)).toBeNull();
  });
});
