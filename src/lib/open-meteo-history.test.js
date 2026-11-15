
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

import {
  normalizeOpenMeteoHistory,
  fetchHistoricalWeather,
  clearHistoricalWeatherCache,
} from './open-meteo-history.js';

const samplePayload = () => ({
  latitude: 13.625,
  longitude: 123.1875,
  hourly: {
    time: [
      '2026-03-10T00:00',
      '2026-03-10T01:00',
      '2026-03-10T02:00',
    ],
    temperature_2m: [26.9, 26.8, 27.7],
    relative_humidity_2m: [59, 64, 61],
    wind_speed_10m: [23.8, 26.4, 26.8],
    wind_direction_10m: [28, 31, 31],
  },
});

const requestOptions = {
  latitude: 13.62,
  longitude: 123.19,
  startDate: '2026-03-10',
  endDate: '2026-03-10',
};

function mockSuccessfulFetch(payload = samplePayload()) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(payload),
  });
}

describe('Open-Meteo response normalization', () => {
  it('converts hourly arrays into timestamped weather records', () => {
    const records = normalizeOpenMeteoHistory(samplePayload());

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      latitude: 13.625,
      longitude: 123.1875,
      observed_at: '2026-03-10T00:00:00.000Z',
      temperature_c: 26.9,
      relative_humidity_pct: 59,
      wind_speed_kmh: 23.8,
      wind_direction_deg: 28,
      provider: 'Open-Meteo Historical Weather API',
    });
  });

  it('preserves UTC hourly timestamps', () => {
    const records = normalizeOpenMeteoHistory(samplePayload());

    expect(records[1].observed_at).toBe(
      '2026-03-10T01:00:00.000Z'
    );
  });

  it('represents missing measurements as null', () => {
    const payload = samplePayload();
    payload.hourly.temperature_2m[0] = null;

    const records = normalizeOpenMeteoHistory(payload);

    expect(records[0].temperature_c).toBeNull();
  });

  it('rejects invalid response objects', () => {
    expect(() => normalizeOpenMeteoHistory(null)).toThrow();
    expect(() => normalizeOpenMeteoHistory('invalid')).toThrow();
  });

  it('rejects invalid response coordinates', () => {
    const payload = samplePayload();
    payload.latitude = 100;

    expect(() => normalizeOpenMeteoHistory(payload)).toThrow(
      'invalid coordinates'
    );
  });

  it('rejects missing hourly data', () => {
    const payload = samplePayload();
    delete payload.hourly;

    expect(() => normalizeOpenMeteoHistory(payload)).toThrow(
      'no hourly timestamps'
    );
  });

  it('rejects incomplete hourly arrays', () => {
    const payload = samplePayload();
    payload.hourly.wind_speed_10m.pop();

    expect(() => normalizeOpenMeteoHistory(payload)).toThrow(
      'missing or incomplete'
    );
  });

  it('rejects malformed timestamps', () => {
    const payload = samplePayload();
    payload.hourly.time[0] = 'not-a-timestamp';

    expect(() => normalizeOpenMeteoHistory(payload)).toThrow(
      'Invalid Open-Meteo timestamp'
    );
  });

  it('rejects invalid calendar dates in timestamps', () => {
    const payload = samplePayload();
    payload.hourly.time[0] = '2026-02-30T00:00';

    expect(() => normalizeOpenMeteoHistory(payload)).toThrow(
      'Invalid calendar timestamp'
    );
  });
});

describe('Open-Meteo historical API client', () => {
  beforeEach(() => {
    clearHistoricalWeatherCache();
    vi.stubGlobal('fetch', mockSuccessfulFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearHistoricalWeatherCache();
  });

  it('requests historical weather with UTC and expected variables', async () => {
    await fetchHistoricalWeather(requestOptions);

    expect(fetch).toHaveBeenCalledTimes(1);

    const url = new URL(fetch.mock.calls[0][0]);

    expect(url.hostname).toBe('archive-api.open-meteo.com');
    expect(url.searchParams.get('latitude')).toBe('13.62');
    expect(url.searchParams.get('longitude')).toBe('123.19');
    expect(url.searchParams.get('start_date')).toBe('2026-03-10');
    expect(url.searchParams.get('end_date')).toBe('2026-03-10');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');

    expect(url.searchParams.get('hourly')).toBe(
      'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m'
    );
  });

  it('returns normalized records', async () => {
    const records = await fetchHistoricalWeather(requestOptions);

    expect(records).toHaveLength(3);
    expect(records[0].temperature_c).toBe(26.9);
    expect(records[0].provider).toBe(
      'Open-Meteo Historical Weather API'
    );
  });

  it('caches successful requests', async () => {
    await fetchHistoricalWeather(requestOptions);
    await fetchHistoricalWeather(requestOptions);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns independent copies of cached records', async () => {
    const first = await fetchHistoricalWeather(requestOptions);
    first[0].temperature_c = 999;

    const second = await fetchHistoricalWeather(requestOptions);

    expect(second[0].temperature_c).toBe(26.9);
  });

  it('clears the cache when requested', async () => {
    await fetchHistoricalWeather(requestOptions);

    clearHistoricalWeatherCache();

    await fetchHistoricalWeather(requestOptions);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid coordinates before making a request', async () => {
    await expect(
      fetchHistoricalWeather({
        ...requestOptions,
        latitude: 120,
      })
    ).rejects.toThrow(RangeError);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid calendar dates', async () => {
    await expect(
      fetchHistoricalWeather({
        ...requestOptions,
        startDate: '2026-02-30',
      })
    ).rejects.toThrow(RangeError);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects reversed date ranges', async () => {
    await expect(
      fetchHistoricalWeather({
        ...requestOptions,
        startDate: '2026-03-11',
        endDate: '2026-03-10',
      })
    ).rejects.toThrow(RangeError);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      })
    );

    await expect(
      fetchHistoricalWeather(requestOptions)
    ).rejects.toThrow('HTTP 429');
  });

  it('does not cache failed requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => samplePayload(),
        })
    );

    await expect(
      fetchHistoricalWeather(requestOptions)
    ).rejects.toThrow('Network unavailable');

    const records = await fetchHistoricalWeather(requestOptions);

    expect(records).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed API responses', async () => {
    vi.stubGlobal(
      'fetch',
      mockSuccessfulFetch({ invalid: true })
    );

    await expect(
      fetchHistoricalWeather(requestOptions)
    ).rejects.toThrow();
  });
});
