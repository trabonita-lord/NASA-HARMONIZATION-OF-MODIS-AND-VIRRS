// One data connection for the Dashboard. Existing backend tables are unchanged.
import { loadTimelineObservations } from './data';
import { REFERENCE_START, REFERENCE_END, normalizeDashboardCoverage } from './dashboard-statistics';

export async function loadDashboardData(signal) {
  const results = await Promise.allSettled([
    loadTimelineObservations(REFERENCE_START, REFERENCE_END, '', signal),
    fetch(import.meta.env.BASE_URL + 'data/dashboard-coverage.json', { signal, cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('Source coverage metadata could not load.');
      return normalizeDashboardCoverage(await response.json());
    }),
  ]);
  if (results[0].status === 'rejected') throw results[0].reason;
  return {
    records: results[0].value.records, sample: results[0].value.demo,
    coverage: results[1].status === 'fulfilled' ? results[1].value : { source: '', ranges: [] },
    coverageError: results[1].status === 'rejected' ? 'Coverage metadata is unavailable. Live reference comparisons are withheld.' : '',
  };
}
