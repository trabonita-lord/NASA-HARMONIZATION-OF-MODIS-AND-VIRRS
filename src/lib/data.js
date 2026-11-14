import { supabase, configured } from './supabase';

const sample = [
  {
    id: 1,
    sensor: 'VIIRS',
    satellite: 'NOAA-21',
    latitude: 13.62,
    longitude: 123.19,
    acq_date: '2026-11-08',
    frp: 16.2,
    confidence: 'h',
    daynight: 'D',
  },
  {
    id: 2,
    sensor: 'MODIS',
    satellite: 'Aqua',
    latitude: 10.32,
    longitude: 123.89,
    acq_date: '2026-11-07',
    frp: 12.1,
    confidence: '75',
    daynight: 'D',
  },
  {
    id: 3,
    sensor: 'VIIRS',
    satellite: 'Suomi NPP',
    latitude: 7.19,
    longitude: 125.45,
    acq_date: '2026-11-06',
    frp: 24,
    confidence: 'n',
    daynight: 'N',
  },
  {
    id: 4,
    sensor: 'MODIS',
    satellite: 'Terra',
    latitude: 16.4,
    longitude: 120.6,
    acq_date: '2026-11-05',
    frp: 9.4,
    confidence: '60',
    daynight: 'D',
  },
  {
    id: 5,
    sensor: 'VIIRS',
    satellite: 'NOAA-20',
    latitude: 11.24,
    longitude: 125,
    acq_date: '2026-11-04',
    frp: 8.7,
    confidence: 'h',
    daynight: 'N',
  },
];

function filterSample(start, end, sensor) {
  return sample.filter((record) =>
    (!start || record.acq_date >= start) &&
    (!end || record.acq_date <= end) &&
    (!sensor || record.sensor === sensor)
  );
}

export async function loadSummary(start, end, sensor) {
  if (!configured) {
    const records = filterSample(start, end, sensor);
    return { records, count: records.length, demo: true };
  }

  let query = supabase
    .from('fire_observations')
    .select(
      'id,sensor,satellite,latitude,longitude,acq_date,acq_time,frp,confidence,daynight,source_file',
      { count: 'exact' },
    )
    .order('acq_date', { ascending: false })
    .limit(1500);

  if (start) query = query.gte('acq_date', start);
  if (end) query = query.lte('acq_date', end);
  if (sensor) query = query.eq('sensor', sensor);

  const { data, error, count } = await query;
  if (error) throw error;
  return { records: data || [], count: count || 0, demo: false };
}

export async function loadCalendar(start, end, sensor) {
  if (!configured) {
    const counts = {};
    for (const record of filterSample(start, end, sensor)) {
      counts[record.acq_date] = (counts[record.acq_date] || 0) + 1;
    }
    return counts;
  }

  const { data, error } = await supabase.rpc('daily_fire_counts', {
    date_from: start,
    date_to: end,
    sensor_filter: sensor || null,
  });
  if (error) throw error;
  return Object.fromEntries(
    (data || []).map(record => [record.day, Number(record.observations)]),
  );
}

// TIMELINE MAP ONLY: Page through every selected observation, rather than the summary's 1,500-row preview.
export async function loadTimelineObservations(start, end, sensor, signal) {
  if (!configured) return { records: filterSample(start, end, sensor), demo: true };
  const records = [];
  let offset = 0;
  while (true) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    let query = supabase.from('fire_observations').select(
      'id,sensor,satellite,latitude,longitude,acq_date,acq_time,frp,confidence,daynight,source_file',
      { count: 'exact' },
    ).gte('acq_date', start).lte('acq_date', end)
      .order('acq_date', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 999);
    if (sensor) query = query.eq('sensor', sensor);
    if (signal) query = query.abortSignal(signal);
    const response = await query;
    if (response.error) throw response.error;
    const page = response.data || [];
    if (!page.length) {
      if (response.count > offset) throw new Error('Timeline observations were incomplete. Please retry.');
      break;
    }
    records.push(...page);
    offset += page.length;
    if (response.count != null ? offset >= response.count : page.length < 1000) break;
  }
  return { records, demo: false };
}
