
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
});
