
import { describe, it, expect } from 'vitest';

import {
  referenceStatistic,
  referenceDifference,
  sourceCovers,
  verifiedReferenceValues,
  calculateDashboard
} from './dashboard-statistics';

describe('TANAW 2026 baseline calculations', () => {
  it('calculates the mean correctly', () => {
    expect(referenceStatistic([2, 4, 6, 8, 10], 'mean')).toBe(6);
  });

  it('calculates the median correctly', () => {
    expect(referenceStatistic([2, 4, 6, 8, 10], 'median')).toBe(6);
    expect(referenceStatistic([2, 4, 6, 8], 'median')).toBe(5);
  });

  it('returns null when no reference values exist', () => {
    expect(referenceStatistic([], 'mean')).toBeNull();
  });

  it('checks continuous source coverage', () => {
    const ranges = [
      { sensor: 'MODIS', start: '2026-01-01', end: '2026-01-03' }
    ];

    expect(sourceCovers(ranges, 'MODIS', '2026-01-01', '2026-01-03')).toBe(true);
    expect(sourceCovers(ranges, 'MODIS', '2026-01-01', '2026-01-04')).toBe(false);
  });

  it('selects only verified sensor dates', () => {
    const daily = [
      { date: '2026-01-01', MODIS: 2, VIIRS: 5, total: 7 },
      { date: '2026-01-02', MODIS: 0, VIIRS: 4, total: 4 },
      { date: '2026-01-03', MODIS: 6, VIIRS: 8, total: 14 }
    ];

    const ranges = [
      { sensor: 'MODIS', start: '2026-01-01', end: '2026-01-02' },
      { sensor: 'VIIRS', start: '2026-01-02', end: '2026-01-03' }
    ];

    expect(verifiedReferenceValues(daily, ranges, 'MODIS')).toEqual([2, 0]);
    expect(verifiedReferenceValues(daily, ranges, 'VIIRS')).toEqual([4, 8]);
    expect(verifiedReferenceValues(daily, ranges, 'total')).toEqual([4]);
  });

  it('withholds values when coverage is unverified', () => {
    const daily = [
      { date: '2026-01-01', MODIS: 2, VIIRS: 5, total: 7 }
    ];

    expect(verifiedReferenceValues(daily, [], 'MODIS')).toEqual([]);
    expect(verifiedReferenceValues(daily, [], 'total')).toEqual([]);
  });

  it('withholds differences when the comparison is incomplete', () => {
    expect(referenceDifference(10, 5, false)).toEqual({
      count: null,
      percent: null
    });
  });

  it('calculates a verified difference correctly', () => {
    expect(referenceDifference(15, 10, true)).toEqual({
      count: 5,
      percent: 50
    });
  });
});

describe('TANAW Dashboard integration', () => {
  const area = {
    id: 'philippines-map-extent',
    label: 'Philippines map extent',
    type: 'extent'
  };

  const records = [
    {
      sensor: 'MODIS',
      acq_date: '2026-01-01',
      latitude: 13.62,
      longitude: 123.18
    },
    {
      sensor: 'VIIRS',
      acq_date: '2026-01-01',
      latitude: 13.63,
      longitude: 123.19
    },
    {
      sensor: 'MODIS',
      acq_date: '2026-01-02',
      latitude: 13.64,
      longitude: 123.20
    },
    {
      sensor: 'VIIRS',
      acq_date: '2026-01-02',
      latitude: 13.65,
      longitude: 123.21
    },
    {
      sensor: 'MODIS',
      acq_date: '2026-01-02',
      latitude: 13.66,
      longitude: 123.22,
      kind: 'forecast'
    }
  ];

  const ranges = [
    {
      sensor: 'MODIS',
      start: '2026-01-01',
      end: '2026-01-02'
    },
    {
      sensor: 'VIIRS',
      start: '2026-01-01',
      end: '2026-01-02'
    }
  ];

  it('calculates a baseline using verified days', () => {
    const result = calculateDashboard(
      records, area, ranges, false, 'mean',
      '2026-01-01', '2026-01-02'
    );

    expect(result.reference.MODIS).toBe(1);
    expect(result.reference.VIIRS).toBe(1);
    expect(result.reference.total).toBe(2);
  });

  it('calculates the selected comparison correctly', () => {
    const result = calculateDashboard(
      records, area, ranges, false, 'mean',
      '2026-01-01', '2026-01-02'
    );

    expect(result.comparison.counts.total).toBe(4);
    expect(result.comparison.complete.total).toBe(true);
    expect(result.comparison.expected.total).toBe(4);
    expect(result.comparison.difference.count).toBe(0);
  });

  it('excludes forecast observations', () => {
    const result = calculateDashboard(
      records, area, ranges, false, 'mean',
      '2026-01-02', '2026-01-02'
    );

    expect(result.comparison.counts.MODIS).toBe(1);
    expect(result.comparison.counts.VIIRS).toBe(1);
    expect(result.comparison.counts.total).toBe(2);
  });

  it('withholds comparisons without verified coverage', () => {
    const result = calculateDashboard(
      records, area, [], false, 'mean',
      '2026-01-01', '2026-01-02'
    );

    expect(result.reference.total).toBeNull();
    expect(result.comparison.complete.total).toBe(false);
    expect(result.comparison.difference.count).toBeNull();
    expect(result.comparison.difference.percent).toBeNull();
  });
});
