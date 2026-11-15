
import { distanceKm, observationTime } from './early-warning';

// Experimental algorithm: not independently validated.
export const HARMONIZATION_V2 = 'spatiotemporal_v2';

export const DEFAULT_MATCH_OPTIONS = Object.freeze({
  maxDistanceKm: 5,
  maxTimeMinutes: 60,
});

function validObservation(record, sensor) {
  return (
    record &&
    record.sensor === sensor &&
    record.id != null &&
    record.latitude != null &&
    record.longitude != null &&
    record.latitude !== '' &&
    record.longitude !== '' &&
    Number.isFinite(Number(record.latitude)) &&
    Number.isFinite(Number(record.longitude)) &&
    Number(record.latitude) >= -90 &&
    Number(record.latitude) <= 90 &&
    Number(record.longitude) >= -180 &&
    Number(record.longitude) <= 180 &&
    observationTime(record) !== null
  );
}

function validateOptions(options) {
  if (
    !Number.isFinite(options.maxDistanceKm) ||
    options.maxDistanceKm <= 0 ||
    !Number.isFinite(options.maxTimeMinutes) ||
    options.maxTimeMinutes <= 0
  ) {
    throw new Error(
      'Matching thresholds must be positive finite numbers.'
    );
  }
}

function compareIds(a, b) {
  return String(a).localeCompare(String(b), 'en', {
    numeric: true,
  });
}

/**
 * Binary search for the first observation whose
 * timestamp is greater than or equal to targetTime.
 *
 * The observations must already be sorted by timestamp.
 */
function lowerBoundByTime(sortedObservations, targetTime) {
  let left = 0;
  let right = sortedObservations.length;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);

    if (sortedObservations[middle].timestamp < targetTime) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

/**
 * Identify candidate MODIS-VIIRS observation associations.
 *
 * Scores describe proximity only, NOT the probability that
 * observations represent the same fire.
 *
 * All valid candidates are retained, including ambiguous matches.
 * No database records are modified.
 *
 * Optimization:
 * VIIRS observations are sorted by acquisition timestamp.
 * Binary search identifies the beginning of the permitted
 * time window for each MODIS observation.
 *
 * This avoids unnecessary comparisons with VIIRS observations
 * outside the configured time window.
 */
export function matchFireObservations(
  observations,
  options = DEFAULT_MATCH_OPTIONS
) {
  if (!Array.isArray(observations)) {
    throw new Error('Observations must be an array.');
  }

  const settings = {
    ...DEFAULT_MATCH_OPTIONS,
    ...options,
  };

  validateOptions(settings);

  // Filter valid MODIS observations.
  const modis = observations.filter(record =>
    validObservation(record, 'MODIS')
  );

  // Filter valid VIIRS observations.
  const viirs = observations.filter(record =>
    validObservation(record, 'VIIRS')
  );

  // Build a timestamp index for VIIRS observations.
  const indexedViirs = viirs
    .map(record => ({
      record,
      timestamp: observationTime(record),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const candidates = [];

  // Convert the configured time threshold to milliseconds.
  const timeWindowMs = settings.maxTimeMinutes * 60_000;

  // Process each valid MODIS observation.
  for (const m of modis) {
    const modisTime = observationTime(m);

    const earliestTime = modisTime - timeWindowMs;
    const latestTime = modisTime + timeWindowMs;

    // Find the first VIIRS observation within the time window.
    const startIndex = lowerBoundByTime(
      indexedViirs,
      earliestTime
    );

    // Examine only VIIRS observations within the time window.
    for (let i = startIndex; i < indexedViirs.length; i++) {
      const {
        record: v,
        timestamp: viirsTime,
      } = indexedViirs[i];

      // Stop once observations exceed the permitted time window.
      if (viirsTime > latestTime) {
        break;
      }

      const timeDifferenceMinutes =
        Math.abs(modisTime - viirsTime) / 60_000;

      // Calculate Haversine distance.
      const spatialDistanceKm = distanceKm(
        Number(m.latitude),
        Number(m.longitude),
        Number(v.latitude),
        Number(v.longitude)
      );

      // Reject observations outside the distance threshold.
      if (spatialDistanceKm > settings.maxDistanceKm) {
        continue;
      }

      // Normalized proximity score; NOT a confidence percentage.
      const distanceComponent =
        spatialDistanceKm / settings.maxDistanceKm;

      const timeComponent =
        timeDifferenceMinutes / settings.maxTimeMinutes;

      const proximityScore = Math.hypot(
        distanceComponent,
        timeComponent
      );

      candidates.push({
        modisObservationId: m.id,
        viirsObservationId: v.id,
        distanceKm: spatialDistanceKm,
        timeDifferenceMinutes,
        proximityScore,
        algorithmVersion: HARMONIZATION_V2,
      });
    }
  }

  // Count candidate associations per observation.
  const modisCandidateCounts = new Map();
  const viirsCandidateCounts = new Map();

  for (const candidate of candidates) {
    const modisId = candidate.modisObservationId;
    const viirsId = candidate.viirsObservationId;

    modisCandidateCounts.set(
      modisId,
      (modisCandidateCounts.get(modisId) ?? 0) + 1
    );

    viirsCandidateCounts.set(
      viirsId,
      (viirsCandidateCounts.get(viirsId) ?? 0) + 1
    );
  }

  // Rank candidate pairs by combined spatial and temporal proximity.
  candidates.sort(
    (a, b) =>
      a.proximityScore - b.proximityScore ||
      a.distanceKm - b.distanceKm ||
      a.timeDifferenceMinutes - b.timeDifferenceMinutes ||
      compareIds(a.modisObservationId, b.modisObservationId) ||
      compareIds(a.viirsObservationId, b.viirsObservationId)
  );

  // Assign a rank within each MODIS observation's candidates.
  const modisRanks = new Map();

  return candidates.map(candidate => {
    const modisId = candidate.modisObservationId;

    const rank = (modisRanks.get(modisId) ?? 0) + 1;
    modisRanks.set(modisId, rank);

    return {
      ...candidate,
      matchRank: rank,
      modisCandidateCount:
        modisCandidateCounts.get(modisId),
      viirsCandidateCount:
        viirsCandidateCounts.get(
          candidate.viirsObservationId
        ),
      ambiguous:
        modisCandidateCounts.get(modisId) > 1 ||
        viirsCandidateCounts.get(
          candidate.viirsObservationId
        ) > 1,
    };
  });
}

/**
 * Summarize candidate associations without interpreting
 * them as independently verified fire events.
 */
export function summarizeV2Matches(matches) {
  const uniqueModis = new Set(
    matches.map(match => match.modisObservationId)
  );

  const uniqueViirs = new Set(
    matches.map(match => match.viirsObservationId)
  );

  const ambiguous = matches.filter(
    match => match.ambiguous
  );

  return {
    algorithmVersion: HARMONIZATION_V2,
    totalCandidatePairs: matches.length,
    uniqueModisObservations: uniqueModis.size,
    uniqueViirsObservations: uniqueViirs.size,
    ambiguousCandidatePairs: ambiguous.length,
    unambiguousCandidatePairs:
      matches.length - ambiguous.length,
  };
}
