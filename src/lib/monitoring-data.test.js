import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('./supabase', () => ({ configured: true, supabase: {from: vi.fn()} }));
import { loadTimelineObservations } from './data';
import { supabase } from './supabase';
const queryFrom = supabase.from;
afterEach(() => vi.clearAllMocks());
describe('Paginated monitoring observation queries', () => {
  it('reuses the satellite query with a spatial bounding box and acquisition/confidence fields', async () => {
    const query = {};
    for (const method of ['select', 'gte', 'lte', 'order', 'range', 'abortSignal']) query[method] = vi.fn().mockReturnValue(query);
    query.then = resolve => Promise.resolve({data: [{id: 1, sensor: 'MODIS'}], count: 1}).then(resolve);
    queryFrom.mockReturnValue(query);
    const controller = new AbortController();
    const result = await loadTimelineObservations('2026-10-15', '2026-11-15', '', controller.signal, {south: 13.5, north: 13.7, west: 123, east: 123.3});
    expect(query.gte).toHaveBeenCalledWith('latitude', 13.5);
    expect(query.lte).toHaveBeenCalledWith('longitude', 123.3);
    expect(query.select.mock.calls[0][0]).toContain('acq_time');
    expect(query.select.mock.calls[0][0]).toContain('confidence');
    expect(query.abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(result.demo).toBe(false); expect(result.records).toHaveLength(1);
  });
  it('does not silently treat a truncated paginated response as complete', async () => {
    const query = {};
    for (const method of ['select', 'gte', 'lte', 'order', 'range']) query[method] = vi.fn().mockReturnValue(query);
    query.then = resolve => Promise.resolve({data: [], count: 2}).then(resolve);
    queryFrom.mockReturnValue(query);
    await expect(loadTimelineObservations('2026-10-15', '2026-11-15', '')).rejects.toThrow('incomplete');
  });
});
