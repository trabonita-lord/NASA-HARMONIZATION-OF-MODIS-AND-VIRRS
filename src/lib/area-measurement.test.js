import { describe, expect, it } from 'vitest';
import { formatAreaMeasurement, polygonAreaSquareMeters } from './area-measurement';

describe('polygon area measurement', () => {
  it('returns zero until three valid vertices are available', () => {
    expect(polygonAreaSquareMeters([[0, 0], [0, 1]])).toBe(0);
    expect(polygonAreaSquareMeters([[0, 0], [0, 1], [1, 1], [NaN, 0]])).toBe(0);
  });

  it('calculates the area of a small geodesic polygon', () => {
    const area = polygonAreaSquareMeters([[0, 0], [0, 0.01], [0.01, 0.01], [0.01, 0]]);
    expect(area).toBeGreaterThan(1_200_000);
    expect(area).toBeLessThan(1_250_000);
  });

  it('formats square metres and larger areas clearly', () => {
    expect(formatAreaMeasurement(2500)).toBe('2500 m²');
    expect(formatAreaMeasurement(1_000_000)).toBe('1.0000 km² (100.00 ha)');
  });
});
