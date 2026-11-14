
import { supabase } from './supabase';

const ALGORITHM_VERSION = 'haversine_v1';
const DISTANCE_THRESHOLD_KM = 5;
const TIME_THRESHOLD_MINUTES = 60;
const PAGE_SIZE = 1000;

export async function loadHarmonizationSummary() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const matches = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('harmonization_matches')
      .select(`
        id,
        modis_observation_id,
        viirs_observation_id,
        distance_km,
        time_difference_minutes
      `)
      .eq('algorithm_version', ALGORITHM_VERSION)
      .eq('distance_threshold_km', DISTANCE_THRESHOLD_KM)
      .eq('time_threshold_minutes', TIME_THRESHOLD_MINUTES)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = data ?? [];
    matches.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  const uniqueModis = new Set(
    matches.map(match => match.modis_observation_id)
  );

  const uniqueViirs = new Set(
    matches.map(match => match.viirs_observation_id)
  );

  const totalDistance = matches.reduce(
    (sum, match) => sum + match.distance_km,
    0
  );

  const totalTime = matches.reduce(
    (sum, match) => sum + match.time_difference_minutes,
    0
  );

  return {
    totalMatches: matches.length,
    uniqueModis: uniqueModis.size,
    uniqueViirs: uniqueViirs.size,
    averageDistanceKm: matches.length
      ? totalDistance / matches.length
      : 0,
    averageTimeMinutes: matches.length
      ? totalTime / matches.length
      : 0,
  };
}
