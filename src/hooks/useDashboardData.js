import { useEffect, useState } from 'react';
import { loadDashboardData } from '../lib/dashboard-data';

const empty = { records: [], sample: false, coverage: { ranges: [], source: '' }, coverageError: '', loading: true, error: '' };
export default function useDashboardData(reloadKey) {
  const [data, setData] = useState(empty);
  useEffect(function loadDashboard() {
    const controller = new AbortController();
    let cancelled = false;
    let expired = false;
    setData(empty);
    const timeout = setTimeout(() => {
      expired = true;
      controller.abort();
      if (!cancelled) setData({ ...empty, loading: false, error: 'Dashboard data timed out. Retry to load it again.' });
    }, 60000);
    loadDashboardData(controller.signal).then(result => {
      if (!cancelled && !expired) setData({ ...result, loading: false, error: '' });
    }).catch(() => {
      if (!cancelled && !expired) setData({ ...empty, loading: false, error: 'Dashboard observations could not load. Please retry.' });
    }).finally(() => clearTimeout(timeout));
    return function cleanUp() { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [reloadKey]);
  return data;
}
