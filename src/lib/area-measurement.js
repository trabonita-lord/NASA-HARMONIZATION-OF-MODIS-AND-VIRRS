const EARTH_RADIUS_METERS = 6_371_008.8;

// Spherical geodesic area for a polygon described by [latitude, longitude] pairs.
export function polygonAreaSquareMeters(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!Array.isArray(current) || !Array.isArray(next) ||
        !Number.isFinite(current[0]) || !Number.isFinite(current[1]) ||
        !Number.isFinite(next[0]) || !Number.isFinite(next[1])) return 0;
    const lat1 = current[0] * Math.PI / 180;
    const lat2 = next[0] * Math.PI / 180;
    const deltaLon = (next[1] - current[1]) * Math.PI / 180;
    total += deltaLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2);
}

export function formatAreaMeasurement(squareMeters) {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) return '0 m²';
  if (squareMeters < 10_000) return `${squareMeters.toFixed(0)} m²`;
  return `${(squareMeters / 1_000_000).toFixed(4)} km² (${(squareMeters / 10_000).toFixed(2)} ha)`;
}
