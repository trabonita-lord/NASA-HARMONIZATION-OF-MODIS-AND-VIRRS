import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SatelliteTemperature from '../components/SatelliteTemperature';
import { kelvinToCelsius, formatCelsius, satelliteTemperatures, BRIGHTNESS_TEMPERATURE_NOTE } from './satellite-temperature';

describe('FIRMS brightness temperatures', () => {
  it('converts Kelvin directly without product scaling', () => {
    expect(kelvinToCelsius(303.45)).toBeCloseTo(30.30, 10);
    expect(formatCelsius(kelvinToCelsius(303.45))).toBe('30.30°C');
    expect(formatCelsius(kelvinToCelsius(263.15))).toBe('-10.00°C');
  });

  it.each([null, undefined, 0, -1, NaN, Infinity, -Infinity, '', '303.45', 'invalid', true, {}, []])('rejects invalid Kelvin: %s', value => {
    expect(kelvinToCelsius(value)).toBeNull();
    expect(formatCelsius(kelvinToCelsius(value))).toBe('Not available');
  });

  it('maps MODIS fields and preserves original Kelvin and provenance', () => {
    const record = Object.freeze({ sensor: 'MODIS', bright_t31: 303.45, brightness: 350 });
    const readings = satelliteTemperatures(record);
    expect(readings[0]).toMatchObject({ field: 'bright_t31', sourceField: 'bright_t31', kelvin: 303.45, originalKelvin: 303.45, formatted: '30.30°C', label: 'MODIS 11 µm brightness temperature', measurementType: 'satellite_brightness_temperature', originalUnit: 'K' });
    expect(readings[1]).toMatchObject({ field: 'brightness', kelvin: 350, label: 'MODIS fire-channel brightness temperature' });
    expect(record.bright_t31).toBe(303.45);
  });

  it('maps native VIIRS channels without crossing them', () => {
    const readings = satelliteTemperatures({ sensor: 'VIIRS', bright_ti5: 290, bright_ti4: 340, brightness: 999, bright_t31: 999 });
    expect(readings[0]).toMatchObject({ field: 'bright_ti5', sourceField: 'bright_ti5', kelvin: 290, label: 'VIIRS I5 brightness temperature' });
    expect(readings[1]).toMatchObject({ field: 'bright_ti4', sourceField: 'bright_ti4', kelvin: 340, label: 'VIIRS I4 fire-channel brightness temperature' });
  });

  it('recognizes existing imported VIIRS aliases', () => {
    const readings = satelliteTemperatures({ sensor: 'VIIRS', bright_t31: 290, brightness: 340 });
    expect(readings[0]).toMatchObject({ sourceField: 'bright_t31', kelvin: 290 });
    expect(readings[1]).toMatchObject({ sourceField: 'brightness', kelvin: 340 });
  });

  it('does not substitute for explicitly missing native measurements or weather', () => {
    const readings = satelliteTemperatures({ sensor: 'VIIRS', bright_ti5: null, bright_t31: 300, temperature_c: 30 });
    expect(readings.every(reading => reading.celsius === null)).toBe(true);
    expect(satelliteTemperatures({ sensor: 'MODIS' }).every(reading => reading.formatted === 'Not available')).toBe(true);
    expect(satelliteTemperatures(null)).toEqual([]);
    expect(satelliteTemperatures({ sensor: 'FORECAST', brightness: 300 })).toEqual([]);
  });

  it('renders channel labels, Celsius, original Kelvin, missing readings and scientific note', () => {
    const html = renderToStaticMarkup(React.createElement(SatelliteTemperature, { observation: { sensor: 'VIIRS', brightness: 303.45 } }));
    expect(html).toContain('VIIRS I4 fire-channel brightness temperature');
    expect(html).toContain('VIIRS I5 brightness temperature');
    expect(html).toContain('30.30°C');
    expect(html).toContain('303.45 K');
    expect(html).toContain('Not available');
    expect(html).toContain(BRIGHTNESS_TEMPERATURE_NOTE);
  });
});
