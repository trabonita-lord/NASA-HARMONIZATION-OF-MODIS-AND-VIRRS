// Pure map calculations. These functions do not fetch or change observation data.
export function validLocation(latitude, longitude) {
  if (latitude === null || longitude === null || latitude === '' || longitude === '') return false;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180;
}

export function observationBounds(records) {
  const valid = records.filter(record => validLocation(record.latitude, record.longitude));
  if (valid.length === 0) return null;
  const latitudes = valid.map(record => Number(record.latitude));
  const longitudes = valid.map(record => Number(record.longitude));
  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ];
}

export function formatCoordinate(value, axis) {
  let direction = value < 0 ? 'S' : 'N';
  if (axis === 'longitude') direction = value < 0 ? 'W' : 'E';
  return Math.abs(value).toFixed(3) + '\u00b0 ' + direction;
}

export function gridSpacing(zoom) {
  if (zoom <= 2) return 30;
  if (zoom <= 4) return 10;
  if (zoom <= 6) return 5;
  if (zoom <= 8) return 1;
  if (zoom <= 10) return 0.5;
  if (zoom <= 12) return 0.1;
  if (zoom <= 14) return 0.05;
  return 0.005;
}

export function gridValues(south, north, west, east, zoom) {
  const step = gridSpacing(zoom);
  const latitudes = [];
  const longitudes = [];
  const startLatitude = Math.ceil(Math.max(-85, south) / step) * step;
  const startLongitude = Math.ceil(Math.max(-180, west) / step) * step;
  for (let value = startLatitude; value <= Math.min(85, north) && latitudes.length < 80; value += step) {
    latitudes.push(Number(value.toFixed(6)));
  }
  for (let value = startLongitude; value <= Math.min(180, east) && longitudes.length < 80; value += step) {
    longitudes.push(Number(value.toFixed(6)));
  }
  return { latitudes, longitudes };
}

export function parseLocation(latitude, longitude) {
  if (!String(latitude).trim() || !String(longitude).trim()) {
    return { error: 'Enter both latitude and longitude.' };
  }
  if (!validLocation(latitude, longitude)) {
    return { error: 'Use latitude -85 to 85 and longitude -180 to 180.' };
  }
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (year < 100) return null;
  const lastDay = new Date(Date.UTC(year, number, 0));
  return { start: month + '-01', end: lastDay.toISOString().slice(0, 10) };
}
