import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeMonitoringWeather, fetchMonitoringWeather, temperatureReferenceRange, fetchTemperatureReference } from './monitoring-weather';
import { clearHistoricalWeatherCache } from './open-meteo-history';
const asOf = Date.parse('2026-11-15T12:00:00Z');
const place = { latitude: 13.62, longitude: 123.19 };
const payload = () => ({ current: { time: '2026-11-15T12:00', temperature_2m: 31, relative_humidity_2m: 55, wind_speed_10m: 15, wind_direction_10m: 90 }, daily: {time: ['2026-11-14'], precipitation_sum: [3]} });
afterEach(() => {vi.unstubAllGlobals(); clearHistoricalWeatherCache();});
describe('Open-Meteo monitoring estimates', () => {
  it('requests actual saved coordinates with current fields, explicit units and recent precipitation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => payload()}));
    const result = await fetchMonitoringWeather(place, asOf);
    const url = fetch.mock.calls[0][0];
    expect(url.origin).toBe('https://api.open-meteo.com');
    expect(url.searchParams.get('latitude')).toBe('13.62');
    expect(url.searchParams.get('longitude')).toBe('123.19');
    expect(url.searchParams.get('current')).toContain('relative_humidity_2m');
    expect(url.searchParams.get('past_days')).toBe('14');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(result).toMatchObject({ temperature_c: 31, wind_direction_label: 'E', observedAt: asOf, rainfall_mm: 3, dry_days: 0 });
  });
  it('keeps missing and out-of-range fields unavailable', () => {
    const body = payload(); Object.assign(body.current, {temperature_2m: null, relative_humidity_2m: 101, wind_speed_10m: -1, wind_direction_10m: '90'});
    const result = normalizeMonitoringWeather(body, asOf);
    expect(result.temperature_c).toBeNull(); expect(result.relative_humidity_pct).toBeNull();
    expect(result.wind_speed_kmh).toBeNull(); expect(result.wind_direction_label).toBeNull();
  });
  it('handles HTTP errors, invalid timestamps and missing location without fabricating readings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 429}));
    await expect(fetchMonitoringWeather(place, asOf)).rejects.toThrow('HTTP 429');
    expect(() => normalizeMonitoringWeather({current: {time: 'invalid'}}, asOf)).toThrow();
    await expect(fetchMonitoringWeather(null, asOf)).rejects.toThrow('saved location');
  });
  it('reuses the archive client and selects only same-hour reference temperatures', async () => {
    expect(temperatureReferenceRange(asOf)).toEqual({startDate: '2025-10-31', endDate: '2025-11-30'});
    const hourly = {time: ['2025-11-15T12:00', '2025-11-15T13:00'], temperature_2m: [29, 40], relative_humidity_2m: [50, 50], wind_speed_10m: [10, 10], wind_direction_10m: [90, 90]};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({...place, hourly})}));
    const result = await fetchTemperatureReference(place, asOf);
    expect(result.values).toEqual([29]);
    expect(fetch.mock.calls[0][0].origin).toBe('https://archive-api.open-meteo.com');
  });
});
