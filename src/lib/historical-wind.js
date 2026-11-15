// Meteorological bearings are clockwise from north and describe wind origin.
export function compassDirection(degrees) {
  if (!Number.isFinite(degrees) || degrees < 0 || degrees > 360) return null;
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor((degrees + 22.5) / 45) % 8];
}

// Scalar speed mean, with speed-weighted circular mean of non-calm bearings.
// Missing directions never become north; calm and cancelling vectors have no bearing.
export function summarizeHourlyWind(hourly, date) {
  const speeds = [], gusts = [];
  let east = 0, north = 0, weight = 0, directions = 0, calm = 0;
  const seen = new Set();
  const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(time) ||
        time.slice(0, 10) !== date || seen.has(time)) continue;
    seen.add(time);
    const speed = hourly.wind_speed_10m?.[i];
    const direction = hourly.wind_direction_10m?.[i];
    const gust = hourly.wind_gusts_10m?.[i];
    if (nonnegative(gust)) gusts.push(gust);
    if (!nonnegative(speed)) continue;
    speeds.push(speed);
    if (speed === 0) { calm++; continue; }
    if (!Number.isFinite(direction) || direction < 0 || direction > 360) continue;
    const radians = direction * Math.PI / 180;
    east += speed * Math.sin(radians);
    north += speed * Math.cos(radians);
    weight += speed;
    directions++;
  }
  const bearing = weight > 0 && Math.hypot(east, north) / weight > 1e-6
    ? (Math.atan2(east, north) * 180 / Math.PI + 360) % 360 : null;
  return {
    wind_speed_10m_mean: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
    wind_speed_hourly_max: speeds.length ? Math.max(...speeds) : null,
    wind_gusts_10m_max: gusts.length ? Math.max(...gusts) : null,
    wind_direction_deg: bearing,
    wind_direction_label: bearing === null ? null : compassDirection(bearing),
    wind_speed_hours: speeds.length, wind_direction_hours: directions,
    wind_calm_hours: calm, wind_gust_hours: gusts.length,
  };
}
