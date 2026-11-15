import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../hooks/useEarlyWarningData', () => ({ default: load }));
import EarlyWarningPage from './EarlyWarningPage';
const place = {key: 'naga', latitude: 13.62, longitude: 123.19, title: 'Naga'};
const base = () => ({ observations: [], observationsDone: true, weather: null, reference: {values: []}, ranges: [], loading: false, loadedAt: Date.now() });
afterEach(() => { vi.unstubAllGlobals(); load.mockReset(); });
describe('Existing Early Warning monitoring panel', () => {
  it('requires saved locations and states scientific limitations without a low risk classification', () => {
    vi.stubGlobal('localStorage', {getItem: () => '[]'}); load.mockReturnValue(base());
    const html = renderToStaticMarkup(<EarlyWarningPage />);
    expect(html).toContain('No saved locations'); expect(html).toContain('Insufficient data');
    expect(html).toContain('These indicators support situational awareness and are not official wildfire forecasts or emergency alerts.');
    expect(html).not.toContain('low risk');
  });
  it('shows nearest/latest detections, source confidence and incomplete baseline status', () => {
    vi.stubGlobal('localStorage', {getItem: () => JSON.stringify([place])});
    const iso = new Date(Date.now() - 3600000).toISOString();
    load.mockReturnValue({...base(), observations: [{...place, sensor: 'VIIRS', satellite: 'NOAA-20', confidence: 'h', acq_date: iso.slice(0, 10), acq_time: iso.slice(11, 16)}]});
    const html = renderToStaticMarkup(<EarlyWarningPage />);
    expect(html).toContain('Nearest recent observation: 0.00 km');
    expect(html).toContain('Most recent in this window:');
    expect(html).toContain('Confidence (source metadata): h');
    expect(html).toContain('VIIRS'); expect(html).toContain('Insufficient data');
    expect(html).toContain('Repeated detections');
    expect(html).toContain('not distinct wildfire incidents');
  });
  it('distinguishes current and historical weather and surfaces weather failures', () => {
    vi.stubGlobal('localStorage', {getItem: () => JSON.stringify([place])});
    load.mockReturnValue({...base(), weatherError: 'HTTP 429', referenceError: 'Archive unavailable'});
    const html = renderToStaticMarkup(<EarlyWarningPage />);
    expect(html).toContain('HTTP 429'); expect(html).toContain('Archive unavailable');
    expect(html).toContain('Historical temperature reference'); expect(html).toContain('Current air temperature');
    expect(html).toContain('Wind alone does not establish fire spread direction');
  });
});
