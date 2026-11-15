
/**
 * TANAW — Real Historical Weather Enrichment Validation
 *
 * Workflow:
 * 1. Read one NASA FIRMS observation from a local CSV.
 * 2. Request historical weather from Open-Meteo.
 * 3. Match weather to the observation by time and location.
 * 4. Display the enriched result.
 *
 * READ-ONLY:
 * - Does not connect to Supabase.
 * - Does not modify local CSV files.
 * - Does not write weather records to disk.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  fetchHistoricalWeather,
} from '../src/lib/open-meteo-history.js';

import {
  matchHistoricalWeather,
  fireObservationTimestamp,
} from '../src/lib/historical-fire-weather.js';

const CSV_PATH = join(
  'data',
  'raw',
  'modis-c61',
  'fire_archive_M-C61_841429.csv'
);

/**
 * Parse one CSV row, respecting quoted fields.
 */
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

/**
 * Read a real, valid NASA FIRMS fire observation.
 */
function loadSampleFireObservation() {
  const contents = readFileSync(CSV_PATH, 'utf8')
    .replace(/^\uFEFF/, '');

  const lines = contents.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('NASA FIRMS CSV has no observations.');
  }

  const headers = parseCsvLine(lines[0]).map(
    value => value.trim().toLowerCase()
  );

  for (let index = 1; index < lines.length; index++) {
    const values = parseCsvLine(lines[index]);

    if (values.length !== headers.length) {
      continue;
    }

    const record = Object.fromEntries(
      headers.map((header, position) => [
        header,
        values[position]?.trim() ?? '',
      ])
    );

    const observation = {
      id: index,
      sensor: 'MODIS',
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
      acq_date: record.acq_date,
      acq_time: record.acq_time,
    };

    if (
      Number.isFinite(observation.latitude) &&
      Number.isFinite(observation.longitude) &&
      observation.latitude >= -90 &&
      observation.latitude <= 90 &&
      observation.longitude >= -180 &&
      observation.longitude <= 180 &&
      fireObservationTimestamp(observation) != null
    ) {
      return observation;
    }
  }

  throw new Error('No valid NASA FIRMS observation found.');
}

/**
 * Fetch enough surrounding dates to cover the
 * weather matching window near midnight UTC.
 */
function surroundingDates(date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);

  const previous = new Date(
    timestamp - 86400000
  ).toISOString().slice(0, 10);

  const next = new Date(
    timestamp + 86400000
  ).toISOString().slice(0, 10);

  return { startDate: previous, endDate: next };
}

async function main() {
  console.log(
    '\n=== TANAW: Real Historical Weather Enrichment ==='
  );

  console.log(
    'Read-only validation using NASA FIRMS and Open-Meteo.\n'
  );

  const observation = loadSampleFireObservation();

  console.log('=== NASA FIRMS Observation ===');
  console.log('Sensor:', observation.sensor);
  console.log('Latitude:', observation.latitude);
  console.log('Longitude:', observation.longitude);
  console.log('Acquisition date:', observation.acq_date);
  console.log('Acquisition time (UTC):', observation.acq_time);
  console.log(
    'UTC timestamp:',
    new Date(
      fireObservationTimestamp(observation)
    ).toISOString()
  );

  const dates = surroundingDates(observation.acq_date);

  console.log('\n=== Requesting Historical Weather ===');
  console.log('Provider: Open-Meteo Historical Weather API');
  console.log('Start date:', dates.startDate);
  console.log('End date:', dates.endDate);

  const start = performance.now();

  const weatherRecords = await fetchHistoricalWeather({
    latitude: observation.latitude,
    longitude: observation.longitude,
    startDate: dates.startDate,
    endDate: dates.endDate,
  });

  console.log(
    'Hourly weather records received:',
    weatherRecords.length
  );

  const match = matchHistoricalWeather(
    observation,
    weatherRecords
  );

  const elapsedMs = performance.now() - start;

  console.log('\n=== Historical Weather Match ===');

  if (!match) {
    console.log(
      'No eligible historical weather record was found.'
    );
    console.log(
      'No weather values were fabricated or substituted.'
    );
  } else {
    console.log('Weather provider:', match.provider);
    console.log('Weather timestamp:', match.weather_timestamp);
    console.log(
      'Distance:',
      match.distance_km.toFixed(3),
      'km'
    );
    console.log(
      'Time difference:',
      match.time_difference_hours.toFixed(2),
      'hours'
    );
    console.log(
      'Temperature:',
      match.temperature_c ?? 'Unavailable',
      '°C'
    );
    console.log(
      'Relative humidity:',
      match.relative_humidity_pct ?? 'Unavailable',
      '%'
    );
    console.log(
      'Wind speed:',
      match.wind_speed_kmh ?? 'Unavailable',
      'km/h'
    );
    console.log(
      'Wind direction:',
      match.wind_direction_deg ?? 'Unavailable',
      'degrees'
    );
    console.log('Match method:', match.match_method);
    console.log('Prediction:', match.is_prediction);
  }

  console.log('\n=== Execution Summary ===');
  console.log(
    'Elapsed time:',
    elapsedMs.toFixed(2),
    'ms'
  );
  console.log(
    'Supabase writes: 0'
  );

  console.log('\n=== Scientific Notes ===');
  console.log(
    'Weather values are historical gridded estimates.'
  );
  console.log(
    'A nearby weather estimate does not prove fire causation.'
  );
  console.log(
    'This is weather enrichment, not fire-risk prediction.'
  );

  console.log('\nValidation completed successfully.');
}

main().catch(error => {
  console.error('\nValidation failed:', error);
  process.exitCode = 1;
});
