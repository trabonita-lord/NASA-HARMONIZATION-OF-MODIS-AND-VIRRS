
import { describe, it, expect } from 'vitest';

import {
  HARMONIZATION_V2,
  matchFireObservations,
  summarizeV2Matches,
} from './harmonization-v2';

function observation(id, sensor, date, time, latitude, longitude) {
  return {
    id,
    sensor,
    acq_date: date,
    acq_time: time,
    latitude,
    longitude,
  };
}

describe('TANAW Harmonization V2', () => {
  it('matches observations within spatial and temporal thresholds', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1230', 13.6, 123.2),
    ];

    const matches = matchFireObservations(records);

    expect(matches).toHaveLength(1);
    expect(matches[0].timeDifferenceMinutes).toBe(30);
    expect(matches[0].distanceKm).toBeCloseTo(0);
    expect(matches[0].algorithmVersion).toBe(HARMONIZATION_V2);
    expect(matches[0].ambiguous).toBe(false);
  });

  it('correctly matches observations across UTC midnight', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '2350', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-09', '0010', 13.6, 123.2),
    ];

    const matches = matchFireObservations(records);

    expect(matches).toHaveLength(1);
    expect(matches[0].timeDifferenceMinutes).toBe(20);
  });

  it('rejects observations outside the time threshold', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1400', 13.6, 123.2),
    ];

    expect(matchFireObservations(records)).toHaveLength(0);
  });

  it('rejects observations outside the distance threshold', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1200', 14.6, 123.2),
    ];

    expect(matchFireObservations(records)).toHaveLength(0);
  });

  it('identifies ambiguous candidate associations', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1205', 13.6, 123.2),
      observation(3, 'VIIRS', '2026-11-08', '1210', 13.6, 123.2),
    ];

    const matches = matchFireObservations(records);

    expect(matches).toHaveLength(2);
    expect(matches.every(match => match.ambiguous)).toBe(true);
    expect(matches.map(match => match.matchRank)).toEqual([1, 2]);
  });

  it('ranks the closest candidate first', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1230', 13.6, 123.2),
      observation(3, 'VIIRS', '2026-11-08', '1205', 13.6, 123.2),
    ];

    const matches = matchFireObservations(records);

    expect(matches[0].viirsObservationId).toBe(3);
    expect(matches[0].matchRank).toBe(1);
  });

  it('rejects observations with invalid acquisition times', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '2500', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1200', 13.6, 123.2),
    ];

    expect(matchFireObservations(records)).toHaveLength(0);
  });

  it('rejects invalid matching thresholds', () => {
    expect(() =>
      matchFireObservations([], { maxDistanceKm: -1 })
    ).toThrow();

    expect(() =>
      matchFireObservations([], { maxTimeMinutes: 0 })
    ).toThrow();
  });

  it('summarizes candidate pairs without counting unique fires', () => {
    const records = [
      observation(1, 'MODIS', '2026-11-08', '1200', 13.6, 123.2),
      observation(2, 'VIIRS', '2026-11-08', '1205', 13.6, 123.2),
      observation(3, 'VIIRS', '2026-11-08', '1210', 13.6, 123.2),
    ];

    const summary = summarizeV2Matches(
      matchFireObservations(records)
    );

    expect(summary.totalCandidatePairs).toBe(2);
    expect(summary.uniqueModisObservations).toBe(1);
    expect(summary.uniqueViirsObservations).toBe(2);
    expect(summary.ambiguousCandidatePairs).toBe(2);
    expect(summary.unambiguousCandidatePairs).toBe(0);
  });

  it('includes observations exactly at the time threshold', () => {
    const records = [
      observation(1001, 'MODIS', '2026-11-15', '1200', 13.62, 123.19),
      observation(2001, 'VIIRS', '2026-11-15', '1100', 13.62, 123.19),
      observation(2002, 'VIIRS', '2026-11-15', '1300', 13.62, 123.19),
      observation(2003, 'VIIRS', '2026-11-15', '1301', 13.62, 123.19),
    ];

    const matches = matchFireObservations(records);

    expect(matches).toHaveLength(2);

    expect(
      matches.map(match => match.viirsObservationId).sort()
    ).toEqual([2001, 2002]);

    expect(
      matches.every(match => match.timeDifferenceMinutes === 60)
    ).toBe(true);
  });
});


it('produces the same candidate pairs as brute-force matching', async () => {
  const { distanceKm, observationTime } =
    await import('./early-warning');

  const records = [];

  // Reproducible synthetic observations across multiple days.
  for (let i = 0; i < 120; i++) {
    const timestamp = new Date(
      Date.UTC(2026, 10, 8, 0, 0) + i * 20 * 60_000
    );

    const date = timestamp.toISOString().slice(0, 10);
    const time = timestamp.toISOString().slice(11, 16).replace(':', '');

    records.push(
      observation(
        i + 1,
        i % 3 === 0 ? 'MODIS' : 'VIIRS',
        date,
        time,
        13.6 + (i % 7) * 0.005,
        123.2 + (i % 5) * 0.005
      )
    );
  }

  const expectedPairs = [];

  // Reference implementation: exhaustive nested-loop matching.
  for (const modis of records.filter(r => r.sensor === 'MODIS')) {
    for (const viirs of records.filter(r => r.sensor === 'VIIRS')) {
      const timeDifferenceMinutes = Math.abs(
        observationTime(modis) - observationTime(viirs)
      ) / 60_000;

      if (timeDifferenceMinutes > 60) continue;

      const spatialDistanceKm = distanceKm(
        modis.latitude,
        modis.longitude,
        viirs.latitude,
        viirs.longitude
      );

      if (spatialDistanceKm > 5) continue;

      expectedPairs.push(
        `${modis.id}:${viirs.id}`
      );
    }
  }

  const actualPairs = matchFireObservations(records).map(
    match => `${match.modisObservationId}:${match.viirsObservationId}`
  );

  expect(actualPairs.sort()).toEqual(expectedPairs.sort());
});


it('benchmarks time-indexed matching on 5,000 observations', () => {
  const records = [];
  const startTime = Date.UTC(2026, 0, 1);

  for (let i = 0; i < 5000; i++) {
    const timestamp = new Date(
      startTime + i * 60 * 60_000
    );

    const date = timestamp.toISOString().slice(0, 10);
    const time = timestamp
      .toISOString()
      .slice(11, 16)
      .replace(':', '');

    records.push(
      observation(
        i + 1,
        i % 4 === 0 ? 'MODIS' : 'VIIRS',
        date,
        time,
        13.6 + (i % 10) * 0.001,
        123.2 + (i % 10) * 0.001
      )
    );
  }

  const start = performance.now();
  const matches = matchFireObservations(records);
  const elapsedMs = performance.now() - start;

  console.log(
    `Harmonization V2: ${records.length} observations, ` +
    `${matches.length} candidate pairs, ` +
    `${elapsedMs.toFixed(2)} ms`
  );

  expect(Number.isFinite(elapsedMs)).toBe(true);
  expect(matches.length).toBeGreaterThanOrEqual(0);
});
