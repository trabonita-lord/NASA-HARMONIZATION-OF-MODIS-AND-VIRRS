export const BRIGHTNESS_TEMPERATURE_NOTE = 'Satellite brightness temperature is a radiometric measurement and does not necessarily represent actual ground surface temperature or flame temperature.';

const channels = {
  MODIS: [
    { field: 'bright_t31', label: 'MODIS 11 µm brightness temperature' },
    { field: 'brightness', label: 'MODIS fire-channel brightness temperature' },
  ],
  VIIRS: [
    { field: 'bright_ti5', normalizedField: 'bright_t31', label: 'VIIRS I5 brightness temperature' },
    { field: 'bright_ti4', normalizedField: 'brightness', label: 'VIIRS I4 fire-channel brightness temperature' },
  ],
};

// FIRMS fields are already Kelvin. No LST product scaling applies.
export function kelvinToCelsius(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value - 273.15 : null;
}

export function formatCelsius(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2)}°C` : 'Not available';
}

export function satelliteTemperatures(observation) {
  return (channels[observation?.sensor] || []).map(channel => {
    // An explicitly present native field takes precedence, including null/invalid
    // readings. The aliases below are established by import-firms.mjs and the CSVs.
    const sourceField = Object.hasOwn(observation, channel.field)
      ? channel.field : channel.normalizedField || channel.field;
    const originalKelvin = observation[sourceField] ?? null;
    const celsius = kelvinToCelsius(originalKelvin);
    return {
      ...channel, sourceField, originalKelvin,
      kelvin: celsius === null ? null : originalKelvin,
      celsius, formatted: formatCelsius(celsius),
      measurementType: 'satellite_brightness_temperature',
      originalUnit: 'K',
    };
  });
}
