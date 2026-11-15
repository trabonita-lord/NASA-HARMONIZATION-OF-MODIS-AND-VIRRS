import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import HistoricalWindSummary from './HistoricalWindSummary';
import { summarizeHourlyWind } from '../lib/historical-wind';
describe('Historical wind display', () => {
  it('renders the compass toward the source bearing and labels wind origin', () => {
    const data = summarizeHourlyWind({ time: ['2020-10-01T00:00'], wind_speed_10m: [10], wind_direction_10m: [90], wind_gusts_10m: [22] }, '2020-10-01');
    const html = renderToStaticMarkup(<HistoricalWindSummary data={data} />);
    expect(html).toContain('rotate(90 60 60)');
    expect(html).toContain('Wind from E, 90.0 degrees');
    expect(html).toContain('22.0 km/h');
    expect(html).toContain('not a validated prediction of fire spread');
    expect(html).toContain('incomplete daily coverage');
  });
  it('renders unavailable gusts and no compass arrow when wind is missing', () => {
    const html = renderToStaticMarkup(<HistoricalWindSummary data={summarizeHourlyWind(null, '2020-10-01')} />);
    expect(html).toContain('Unavailable'); expect(html).not.toContain('rotate(');
    expect(html).not.toContain('0.0 km/h');
  });
});
