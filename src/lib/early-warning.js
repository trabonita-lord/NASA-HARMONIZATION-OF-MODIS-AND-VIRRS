// EARLY WARNING REVIEW RULES: these are grouping/search settings, not official alert thresholds.
import { validLocation } from './map-utils';

export const REPEAT_WINDOW_HOURS = 72;
export const REPEAT_DISTANCE_KM = 1;
export const MIN_REPEAT_GAP_MINUTES = 30;
const HOUR_MS = 3600000;

export function distanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = value => value * Math.PI / 180;
  const deltaLat = radians(latitudeB - latitudeA);
  const deltaLon = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

// Source acquisition times are UTC. Missing/invalid times must not become recent alerts.
export function observationTime(record) {
  if (!record || record.kind === 'forecast' || typeof record.acq_date !== 'string') return null;
  if (record.acq_time == null || String(record.acq_time).trim() === '') return null;
  const sourceTime = String(record.acq_time).trim();
  if (sourceTime.includes(':') && !/^\d{1,2}:\d{2}$/.test(sourceTime)) return null;
  const raw = sourceTime.replace(':', '');
  if (!/^\d{1,4}$/.test(raw)) return null;
  const clock = raw.padStart(4, '0');
  const hours = Number(clock.slice(0, 2));
  const minutes = Number(clock.slice(2));
  if (hours > 23 || minutes > 59) return null;
  const time = Date.parse(record.acq_date + 'T' + clock.slice(0, 2) + ':' + clock.slice(2) + ':00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== record.acq_date) return null;
  return time;
}

export function nearbyObservations(records, place, radiusKm, hours, asOf) {
  if (!place || !Number.isFinite(asOf) || !Number.isFinite(radiusKm) || radiusKm <= 0 || !Number.isFinite(hours) || hours <= 0) return [];
  const earliest = asOf - hours * HOUR_MS;
  const results = [];
  for (const record of records) {
    const time = observationTime(record);
    if (time == null || time < earliest || time > asOf || !validLocation(record.latitude, record.longitude)) continue;
    const distance = distanceKm(place.latitude, place.longitude, Number(record.latitude), Number(record.longitude));
    if (distance <= radiusKm) results.push({ ...record, observedAt: time, distanceKm: distance });
  }
  return results.sort((a, b) => b.observedAt - a.observedAt || a.distanceKm - b.distanceKm);
}

export function repeatedDetections(records, place, radiusKm, asOf) {
  const nearby = nearbyObservations(records, place, radiusKm, REPEAT_WINDOW_HOURS, asOf).sort((a, b) => a.observedAt - b.observedAt);
  const groups = [];
  for (const record of nearby) {
    // Compare to the fixed first-point anchor to avoid chaining unrelated locations together.
    let group = groups.find(item => distanceKm(item.latitude, item.longitude, Number(record.latitude), Number(record.longitude)) <= REPEAT_DISTANCE_KM);
    if (!group) {
      group = { key: 'repeat-' + record.latitude + '-' + record.longitude, latitude: Number(record.latitude), longitude: Number(record.longitude), records: [], windows: [] };
      groups.push(group);
    }
    group.records.push(record);
    const previous = group.windows[group.windows.length - 1];
    if (previous == null || record.observedAt - previous >= MIN_REPEAT_GAP_MINUTES * 60000) group.windows.push(record.observedAt);
  }
  return groups.filter(group => group.windows.length >= 2).map(group => ({
    ...group, firstSeen: group.records[0].observedAt, lastSeen: group.records[group.records.length - 1].observedAt,
    latest: group.records[group.records.length - 1], acquisitionWindows: group.windows.length,
  })).sort((a, b) => b.lastSeen - a.lastSeen);
}

export function formatWarningTime(time) {
  if (!Number.isFinite(time)) return 'Time unavailable';
  return new Date(time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
}
