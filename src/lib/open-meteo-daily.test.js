import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fetchDailyHistoricalWeather, clearHistoricalWeatherCache } from './open-meteo-history';
const options = { latitude: 13.62, longitude: 123.19, date: '2020-10-01' };
const fields = ['temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'relative_humidity_2m_mean', 'wind_speed_10m_max'];
function payload() {
  return { hourly: { time: Array.from({length: 24}, (_, i) => `${options.date}T${String(i).padStart(2, '0')}:00`), wind_speed_10m: Array(24).fill(10), wind_direction_10m: Array(24).fill(45), wind_gusts_10m: Array(24).fill(20) }, latitude: 13.625, longitude: 123.1875, daily: { time: [options.date], ...Object.fromEntries(fields.map((field, i) => [field, [i === 3 ? 0 : 20 + i]])) } };
}
function respond(body = payload()) { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body })); }
beforeEach(() => clearHistoricalWeatherCache());
afterEach(() => vi.unstubAllGlobals());
describe('Calendar daily archive weather', () => {
  it('requests the exact selected location and UTC date with explicit units and all six metrics', async () => {
    respond();
    const result = await fetchDailyHistoricalWeather(options);
    const url = fetch.mock.calls[0][0];
    expect(url.searchParams.get('hourly')).toBe('wind_speed_10m,wind_direction_10m,wind_gusts_10m');
    expect(result.wind_direction_label).toBe('NE');
    expect(result.wind_speed_10m_mean).toBe(10);
    expect(url.origin).toBe('https://archive-api.open-meteo.com');
    for (const [key, value] of Object.entries({ latitude: '13.62', longitude: '123.19', start_date: options.date, end_date: options.date, timezone: 'UTC', temperature_unit: 'celsius', precipitation_unit: 'mm', wind_speed_unit: 'kmh', daily: fields.join(',') })) expect(url.searchParams.get(key)).toBe(value);
    expect(result.precipitation_sum).toBe(0);
    expect(result.temperature_2m_mean).toBe(20);
    expect(result.provider).toBe('Open-Meteo Historical Weather API');
    result.temperature_2m_mean = 999;
    expect((await fetchDailyHistoricalWeather(options)).temperature_2m_mean).toBe(20);
    expect(fetch).toHaveBeenCalledTimes(1);
    await fetchDailyHistoricalWeather({ ...options, longitude: 124 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not invent missing values or cache partial responses', async () => {
    const body = payload(); body.daily.temperature_2m_mean = [null]; body.daily.relative_humidity_2m_mean = ['80'];
    respond(body);
    const result = await fetchDailyHistoricalWeather(options);
    expect(result.temperature_2m_mean).toBeNull(); expect(result.relative_humidity_2m_mean).toBeNull();
    await fetchDailyHistoricalWeather(options); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not use data from another date', async () => {
    const body = payload(); body.daily.time = ['2020-10-02']; respond(body);
    const result = await fetchDailyHistoricalWeather(options);
    expect(fields.every(field => result[field] === null)).toBe(true);
  });
  it('rejects invalid coordinates, dates, and unavailable historical days before fetching', async () => {
    respond();
    for (const changes of [{ latitude: null }, { longitude: 181 }, { date: '2020-02-30' }, { date: '1939-12-31' }, { date: '2999-01-01' }, { date: new Date().toISOString().slice(0, 10) }]) await expect(fetchDailyHistoricalWeather({ ...options, ...changes })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('surfaces API errors, malformed responses, and cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(fetchDailyHistoricalWeather(options)).rejects.toThrow('HTTP 429');
    respond({}); await expect(fetchDailyHistoricalWeather(options)).rejects.toThrow('Invalid Open-Meteo');
    respond({ error: true }); await expect(fetchDailyHistoricalWeather(options)).rejects.toThrow('could not provide');
    const controller = new AbortController(); controller.abort();
    await expect(fetchDailyHistoricalWeather({ ...options, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
