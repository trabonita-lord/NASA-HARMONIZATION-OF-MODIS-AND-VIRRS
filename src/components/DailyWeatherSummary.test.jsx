import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import DailyWeatherSummary from './DailyWeatherSummary';
describe('Calendar weather panel', () => {
  it('requires an explicit location without falling back to arbitrary coordinates', () => {
    const html = renderToStaticMarkup(<DailyWeatherSummary date="2020-10-01" />);
    expect(html).toContain('SELECT LOCATION');
    expect(html).toContain('map Location Tool');
    expect(html).toContain('Historical Weather Conditions');
    expect(html).toContain('2020-10-01 UTC');
    expect(html).not.toContain('Forecast');
  });
  it('identifies the selected location and shows loading before the request completes', () => {
    const html = renderToStaticMarkup(<DailyWeatherSummary date="2020-10-01" location={{ latitude: 13.62, longitude: 123.19, title: 'Naga' }} />);
    expect(html).toContain('LOADING'); expect(html).toContain('Naga');
    expect(html).toContain('13.6200, 123.1900');
    expect(html).toContain('Open-Meteo Historical Weather API');
  });
});
