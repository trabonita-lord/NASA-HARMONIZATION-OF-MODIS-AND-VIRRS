
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  matchFireObservations,
  summarizeV2Matches,
} from '../src/lib/harmonization-v2.js';

const SOURCE_ROOT = 'data/raw';

/**
 * Parse CSV content, including quoted fields and escaped quotes.
 * This follows the parsing behavior of the existing FIRMS importer.
 */
function csvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (quoted) {
        field += c;
      } else {
        if (c === '\r' && text[i + 1] === '\n') i++;

        row.push(field);

        if (row.some(value => value !== '')) {
          rows.push(row);
        }

        row = [];
        field = '';
      }
    } else {
      field += c;
    }
  }

  if (quoted) {
    throw new Error('Unterminated quoted CSV field.');
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Recursively discover NASA FIRMS CSV files.
 */
function discoverCsvFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...discoverCsvFiles(path));
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.csv')
    ) {
      files.push(path);
    }
  }

  return files.sort();
}

/**
 * Validate an acquisition date and time.
 * NASA FIRMS acquisition times are interpreted as UTC.
 */
function validAcquisitionTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  if (!/^\d{1,4}$/.test(time)) {
    return false;
  }

  const clock = time.padStart(4, '0');
  const hours = Number(clock.slice(0, 2));
  const minutes = Number(clock.slice(2));

  if (hours > 23 || minutes > 59) {
    return false;
  }

  const timestamp = Date.parse(
    `${date}T${clock.slice(0, 2)}:${clock.slice(2)}:00Z`
  );

  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === date
  );
}

/**
 * Load valid observations from local NASA FIRMS CSV files.
 *
 * IDs are temporary local identifiers, not Supabase IDs.
 * No database connection or modification occurs.
 */
function loadObservations() {
  const files = discoverCsvFiles(SOURCE_ROOT);

  if (!files.length) {
    throw new Error(
      'No NASA FIRMS CSV files found inside data/raw.'
    );
  }

  const observations = [];

  const stats = {
    totalRows: 0,
    invalidRows: 0,
    invalidCoordinates: 0,
    missingTimes: 0,
    invalidTimes: 0,
    invalidDates: 0,
    invalidConfidence: 0,
  };

  let nextId = 1;

  console.log('=== NASA FIRMS Source Files ===');

  for (const file of files) {
    const relativePath = relative(SOURCE_ROOT, file)
      .replaceAll('\\', '/');

    const sensor = relativePath
      .toLowerCase()
      .includes('modis')
      ? 'MODIS'
      : 'VIIRS';

    const rows = csvRows(
      readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    );

    const headers = (rows.shift() || []).map(
      header => header.trim().toLowerCase()
    );

    const requiredHeaders = [
      'latitude',
      'longitude',
      'acq_date',
      'acq_time',
    ];

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(
          `${relativePath}: missing required header "${header}"`
        );
      }
    }

    let accepted = 0;
    let rejected = 0;

    for (const values of rows) {
      stats.totalRows++;

      if (values.length !== headers.length) {
        stats.invalidRows++;
        rejected++;
        continue;
      }

      const record = Object.fromEntries(
        headers.map((header, index) => [
          header,
          (values[index] ?? '').trim(),
        ])
      );

      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);

      if (
        record.latitude === '' ||
        record.longitude === '' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        stats.invalidCoordinates++;
        rejected++;
        continue;
      }

      if (!record.acq_date ||
          !/^\d{4}-\d{2}-\d{2}$/.test(record.acq_date) ||
          !Number.isFinite(Date.parse(record.acq_date)) ||
          new Date(record.acq_date).toISOString().slice(0, 10) !==
            record.acq_date
      ) {
        stats.invalidDates++;
        rejected++;
        continue;
      }

      if (!record.acq_time) {
        stats.missingTimes++;
        rejected++;
        continue;
      }

      if (!validAcquisitionTime(
        record.acq_date,
        record.acq_time
      )) {
        stats.invalidTimes++;
        rejected++;
        continue;
      }

      // Match the importer's sensor-specific confidence validation.
      if (record.confidence) {
        const validConfidence =
          sensor === 'MODIS'
            ? /^\d+$/.test(record.confidence) &&
              Number(record.confidence) <= 100
            : ['l', 'n', 'h'].includes(record.confidence);

        if (!validConfidence) {
          stats.invalidConfidence++;
          rejected++;
          continue;
        }
      }

      observations.push({
        id: nextId++,
        sensor,
        latitude,
        longitude,
        acq_date: record.acq_date,
        acq_time: record.acq_time,
      });

      accepted++;
    }

    console.log(
      `${relativePath}: accepted=${accepted.toLocaleString()}, ` +
      `excluded=${rejected.toLocaleString()}`
    );
  }

  return {
    files,
    observations,
    stats,
  };
}

/**
 * Perform a read-only benchmark of Harmonization V2.
 */
async function main() {
  console.log(
    '\n=== TANAW Harmonization V2: Real-Data Validation ==='
  );

  console.log(
    'Read-only local analysis. No Supabase connection or writes.\n'
  );

  const { files, observations, stats } =
    loadObservations();

  const modisCount = observations.filter(
    record => record.sensor === 'MODIS'
  ).length;

  const viirsCount = observations.filter(
    record => record.sensor === 'VIIRS'
  ).length;

  console.log('\n=== Dataset Summary ===');
  console.log('CSV files:', files.length);
  console.log('Total CSV data rows:', stats.totalRows);
  console.log(
    'Matchable observations:',
    observations.length
  );
  console.log('MODIS observations:', modisCount);
  console.log('VIIRS observations:', viirsCount);

  console.log('\n=== Excluded Observations ===');
  console.log('Malformed rows:', stats.invalidRows);
  console.log('Invalid coordinates:', stats.invalidCoordinates);
  console.log('Invalid dates:', stats.invalidDates);
  console.log('Missing times:', stats.missingTimes);
  console.log('Invalid times:', stats.invalidTimes);
  console.log('Invalid confidence:', stats.invalidConfidence);

  console.log('\n=== Running Harmonization V2 ===');

  const start = performance.now();

  const matches = matchFireObservations(observations);

  const elapsedMs = performance.now() - start;

  const summary = summarizeV2Matches(matches);

  console.log('\n=== Harmonization V2 Results ===');
  console.log('Algorithm:', summary.algorithmVersion);
  console.log(
    'Candidate pairs:',
    summary.totalCandidatePairs
  );
  console.log(
    'Unique MODIS observations:',
    summary.uniqueModisObservations
  );
  console.log(
    'Unique VIIRS observations:',
    summary.uniqueViirsObservations
  );
  console.log(
    'Ambiguous candidate pairs:',
    summary.ambiguousCandidatePairs
  );
  console.log(
    'Unambiguous candidate pairs:',
    summary.unambiguousCandidatePairs
  );

  const ambiguityRate =
    summary.totalCandidatePairs > 0
      ? (
          summary.ambiguousCandidatePairs /
          summary.totalCandidatePairs *
          100
        )
      : 0;

  console.log(
    'Ambiguous candidate rate:',
    ambiguityRate.toFixed(2) + '%'
  );

  console.log(
    'Processing time:',
    elapsedMs.toFixed(2),
    'ms'
  );

  console.log('\n=== Scientific Limitations ===');
  console.log(
    'Candidate associations are not independently verified fires.'
  );
  console.log(
    'The proximity score is not a calibrated confidence probability.'
  );
  console.log(
    'Scientific accuracy requires independent ground-truth validation.'
  );

  console.log('\nValidation completed successfully.');
}

main().catch(error => {
  console.error('\nValidation failed:', error);
  process.exitCode = 1;
});
