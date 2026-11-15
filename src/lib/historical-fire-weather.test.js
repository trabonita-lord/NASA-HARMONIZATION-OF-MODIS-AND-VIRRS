
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WEATHER_MATCH_OPTIONS,
  weatherDistanceKm,
  fireObservationTimestamp,
  normalizeHistoricalWeatherRecord,
  matchHistoricalWeather,
  enrichFireObservationsWithWeather,
} from './historical-fire-weather.js';

const fire = {
  id: 101,
  sensor: 'MODIS',
  latitude: 13.62,
  longitude: 123.19,
  acq_date: '2026-03-10',
  acq_time: '0600',
};

const weather = {
  latitude: 13.62,
  longitude: 123.19,
  observed_at: '2026-03-10T06:00:00Z',
  temperature_c: 32,
  relative_humidity_pct: 58,
  wind_speed_kmh: 14,
  wind_direction_deg: 90,
  provider: 'Test Historical Weather Provider',
};

describe('Historical weather configuration', () => {
  it('provides positive matching thresholds', () => {
    expect(DEFAULT_WEATHER_MATCH_OPTIONS.maxDistanceKm).toBeGreaterThan(0);
    expect(DEFAULT_WEATHER_MATCH_OPTIONS.maxTimeHours).toBeGreaterThan(0);
  });
});

describe('Geographic distance', () => {
  it('returns zero for identical coordinates', () => {
    expect(weatherDistanceKm(fire, weather)).toBeCloseTo(0, 6);
  });

  it('calculates a reasonable distance for nearby locations', () => {
    const distance = weatherDistanceKm(
      { latitude: 13.62, longitude: 123.19 },
      { latitude: 13.72, longitude: 123.19 }
    );

    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(12);
  });

  it('rejects invalid coordinates', () => {
    expect(
      weatherDistanceKm(
        { latitude: 100, longitude: 123 },
        weather
      )
    ).toBeNull();
  });
});

describe('FIRMS acquisition timestamps', () => {
  it('parses valid UTC acquisition times', () => {
    expect(fireObservationTimestamp(fire)).toBe(
      Date.parse('2026-03-10T06:00:00Z')
    );
  });

  it('pads short acquisition times correctly', () => {
    expect(
      fireObservationTimestamp({
        ...fire,
        acq_time: '45',
      })
    ).toBe(Date.parse('2026-03-10T00:45:00Z'));
  });

  it('rejects missing or invalid acquisition times', () => {
    expect(
      fireObservationTimestamp({ ...fire, acq_time: null })
    ).toBeNull();

    expect(
      fireObservationTimestamp({ ...fire, acq_time: '2560' })
    ).toBeNull();
  });

  it('rejects invalid calendar dates', () => {
    expect(
      fireObservationTimestamp({
        ...fire,
        acq_date: '2026-02-30',
      })
    ).toBeNull();
  });
});

describe('Historical weather record validation', () => {
  it('normalizes valid weather data', () => {
    const result = normalizeHistoricalWeatherRecord(weather);

    expect(result).not.toBeNull();
    expect(result.provider).toBe(weather.provider);
    expect(result.temperature_c).toBe(32);
    expect(result.relative_humidity_pct).toBe(58);
    expect(result.wind_direction_deg).toBe(90);
  });

  it('rejects records without a provider', () => {
    expect(
      normalizeHistoricalWeatherRecord({
        ...weather,
        provider: '',
      })
    ).toBeNull();
  });

  it('rejects humidity above 100 percent', () => {
    expect(
      normalizeHistoricalWeatherRecord({
        ...weather,
        relative_humidity_pct: 120,
      })
    ).toBeNull();
  });

  it('rejects negative wind speed', () => {
    expect(
      normalizeHistoricalWeatherRecord({
        ...weather,
        wind_speed_kmh: -5,
      })
    ).toBeNull();
  });

  it('rejects malformed timestamps', () => {
    expect(
      normalizeHistoricalWeatherRecord({
        ...weather,
        observed_at: 'not-a-date',
      })
    ).toBeNull();
  });
});

describe('Historical weather matching', () => {
  it('matches a weather record at the same time and location', () => {
    const result = matchHistoricalWeather(fire, [weather]);

    expect(result).not.toBeNull();
    expect(result.observation_id).toBe(101);
    expect(result.distance_km).toBeCloseTo(0, 6);
    expect(result.time_difference_hours).toBe(0);
    expect(result.temperature_c).toBe(32);
    expect(result.is_prediction).toBe(false);
  });

  it('prioritizes time difference before geographic distance', () => {
    const closerButOlder = {
      ...weather,
      observed_at: '2026-03-10T04:00:00Z',
      temperature_c: 29,
    };

    const fartherButNewer = {
      ...weather,
      latitude: 13.65,
      observed_at: '2026-03-10T05:30:00Z',
      temperature_c: 34,
    };

    const result = matchHistoricalWeather(
      fire,
      [closerButOlder, fartherButNewer]
    );

    expect(result.temperature_c).toBe(34);
    expect(result.time_difference_hours).toBe(0.5);
  });

  it('uses distance to break equal-time ties', () => {
    const farther = {
      ...weather,
      latitude: 13.7,
      temperature_c: 30,
    };

    const result = matchHistoricalWeather(
      fire,
      [farther, weather]
    );

    expect(result.temperature_c).toBe(32);
  });

  it('does not match weather outside the time threshold', () => {
    const oldWeather = {
      ...weather,
      observed_at: '2026-03-09T20:00:00Z',
    };

    expect(
      matchHistoricalWeather(fire, [oldWeather])
    ).toBeNull();
  });

  it('does not match weather outside the distance threshold', () => {
    const distantWeather = {
      ...weather,
      latitude: 14.5,
    };

    expect(
      matchHistoricalWeather(fire, [distantWeather])
    ).toBeNull();
  });

  it('returns null when no weather records are available', () => {
    expect(matchHistoricalWeather(fire, [])).toBeNull();
  });

  it('rejects invalid matching thresholds', () => {
    expect(() =>
      matchHistoricalWeather(fire, [weather], {
        maxDistanceKm: -1,
      })
    ).toThrow(RangeError);
  });

  it('rejects non-array weather input', () => {
    expect(() =>
      matchHistoricalWeather(fire, null)
    ).toThrow(TypeError);
  });
});

describe('Fire observation enrichment', () => {
  it('preserves observations and adds historical weather', () => {
    const observations = [
      fire,
      {
        ...fire,
        id: 102,
        latitude: 15.5,
        longitude: 121.0,
      },
    ];

    const result = enrichFireObservationsWithWeather(
      observations,
      [weather]
    );

    expect(result).toHaveLength(2);
    expect(result[0].historical_weather).not.toBeNull();
    expect(result[1].historical_weather).toBeNull();

    expect(result[0].id).toBe(101);
    expect(result[1].id).toBe(102);
  });

  it('does not mutate the original fire observation', () => {
    const original = { ...fire };

    enrichFireObservationsWithWeather([fire], [weather]);

    expect(fire).toEqual(original);
  });

  it('rejects non-array observations', () => {
    expect(() =>
      enrichFireObservationsWithWeather(null, [weather])
    ).toThrow(TypeError);
  });
});
