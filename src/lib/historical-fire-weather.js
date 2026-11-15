
/**
 * TANAW — Historical Fire Weather Enrichment
 *
 * Matches NASA FIRMS fire observations with historical
 * weather records using geographic distance and time.
 *
 * IMPORTANT:
 * - This module does not fetch weather data.
 * - It does not predict fire occurrence or spread.
 * - It does not calculate a fire-risk score.
 * - Weather data must come from a documented provider.
 */

const EARTH_RADIUS_KM = 6371;

export const DEFAULT_WEATHER_MATCH_OPTIONS = {
  maxDistanceKm: 25,
  maxTimeHours: 3,
};

function validCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate geographic distance using the Haversine formula.
 */
export function weatherDistanceKm(a, b) {
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);

  if (
    !validCoordinate(lat1, lon1) ||
    !validCoordinate(lat2, lon2)
  ) {
    return null;
  }

  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.sqrt(Math.min(1, haversine)))
  );
}

/**
 * Convert a FIRMS acquisition date and UTC time to milliseconds.
 */
export function fireObservationTimestamp(observation) {
  const date = observation?.acq_date;
  const time = observation?.acq_time;

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    time == null
  ) {
    return null;
  }

  const clock = String(time).trim();

  if (!/^\d{1,4}$/.test(clock)) {
    return null;
  }

  const padded = clock.padStart(4, '0');
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2));

  if (hours > 23 || minutes > 59) {
    return null;
  }

  const timestamp = Date.parse(
    `${date}T${padded.slice(0, 2)}:${padded.slice(2)}:00Z`
  );

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return timestamp;
}

/**
 * Validate a historical weather record.
 *
 * Expected example:
 * {
 *   latitude: 13.6,
 *   longitude: 123.2,
 *   observed_at: "2026-03-10T06:00:00Z",
 *   temperature_c: 32,
 *   relative_humidity_pct: 58,
 *   wind_speed_kmh: 14,
 *   wind_direction_deg: 90,
 *   provider: "Example historical weather provider"
 * }
 */
export function normalizeHistoricalWeatherRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (
    record.latitude == null ||
    record.longitude == null ||
    record.latitude === '' ||
    record.longitude === '' ||
    !validCoordinate(latitude, longitude)
  ) {
    return null;
  }

  if (
    typeof record.observed_at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      record.observed_at
    )
  ) {
    return null;
  }

  const timestamp = Date.parse(record.observed_at);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const provider =
    typeof record.provider === 'string'
      ? record.provider.trim()
      : '';

  if (!provider) {
    return null;
  }

  const numericFields = {
    temperature_c: [-100, 70],
    relative_humidity_pct: [0, 100],
    wind_speed_kmh: [0, Infinity],
    wind_direction_deg: [0, 360],
  };

  const normalized = {
    latitude,
    longitude,
    observed_at: record.observed_at,
    timestamp,
    provider,
  };

  for (const [field, [minimum, maximum]] of Object.entries(
    numericFields
  )) {
    const value = record[field];

    if (value == null) {
      normalized[field] = null;
      continue;
    }

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      return null;
    }

    normalized[field] = value;
  }

  return normalized;
}

/**
 * Find the nearest eligible historical weather record.
 *
 * Selection priority:
 * 1. Smallest absolute time difference
 * 2. Smallest geographic distance
 *
 * A match means nearby weather context, not that the
 * conditions were measured at the exact fire location.
 */
export function matchHistoricalWeather(
  observation,
  weatherRecords,
  options = {}
) {
  if (!Array.isArray(weatherRecords)) {
    throw new TypeError('weatherRecords must be an array.');
  }

  const settings = {
    ...DEFAULT_WEATHER_MATCH_OPTIONS,
    ...options,
  };

  if (
    !Number.isFinite(settings.maxDistanceKm) ||
    settings.maxDistanceKm <= 0 ||
    !Number.isFinite(settings.maxTimeHours) ||
    settings.maxTimeHours <= 0
  ) {
    throw new RangeError('Invalid weather matching thresholds.');
  }

  const fireTimestamp = fireObservationTimestamp(observation);

  if (fireTimestamp == null) {
    return null;
  }

  if (
    observation.latitude == null ||
    observation.longitude == null ||
    observation.latitude === '' ||
    observation.longitude === ''
  ) {
    return null;
  }

  const fireLocation = {
    latitude: Number(observation.latitude),
    longitude: Number(observation.longitude),
  };

  if (
    !validCoordinate(
      fireLocation.latitude,
      fireLocation.longitude
    )
  ) {
    return null;
  }

  let bestMatch = null;

  for (const rawRecord of weatherRecords) {
    const weather = normalizeHistoricalWeatherRecord(
      rawRecord
    );

    if (!weather) {
      continue;
    }

    const timeDifferenceHours =
      Math.abs(weather.timestamp - fireTimestamp) / 3600000;

    if (timeDifferenceHours > settings.maxTimeHours) {
      continue;
    }

    const distanceKm = weatherDistanceKm(
      fireLocation,
      weather
    );

    if (
      distanceKm == null ||
      distanceKm > settings.maxDistanceKm
    ) {
      continue;
    }

    const candidate = {
      weather,
      distanceKm,
      timeDifferenceHours,
    };

    if (
      !bestMatch ||
      candidate.timeDifferenceHours <
        bestMatch.timeDifferenceHours ||
      (
        candidate.timeDifferenceHours ===
          bestMatch.timeDifferenceHours &&
        candidate.distanceKm < bestMatch.distanceKm
      )
    ) {
      bestMatch = candidate;
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    observation_id: observation.id ?? null,
    fire_timestamp: new Date(fireTimestamp).toISOString(),
    weather_timestamp: new Date(
      bestMatch.weather.timestamp
    ).toISOString(),
    provider: bestMatch.weather.provider,
    distance_km: bestMatch.distanceKm,
    time_difference_hours: bestMatch.timeDifferenceHours,
    temperature_c: bestMatch.weather.temperature_c,
    relative_humidity_pct:
      bestMatch.weather.relative_humidity_pct,
    wind_speed_kmh: bestMatch.weather.wind_speed_kmh,
    wind_direction_deg: bestMatch.weather.wind_direction_deg,
    match_method: 'nearest_time_then_distance',
    is_prediction: false,
  };
}

/**
 * Enrich multiple fire observations.
 *
 * Unmatched observations are retained, with weather set
 * to null. No weather values are fabricated.
 */
export function enrichFireObservationsWithWeather(
  observations,
  weatherRecords,
  options = {}
) {
  if (!Array.isArray(observations)) {
    throw new TypeError('observations must be an array.');
  }

  return observations.map(observation => ({
    ...observation,
    historical_weather: matchHistoricalWeather(
      observation,
      weatherRecords,
      options
    ),
  }));
}
