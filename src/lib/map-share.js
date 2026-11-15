// Share only the visible map settings, never saved locations, records, or API keys.
import { MAP_BACKGROUNDS, PHILIPPINES_BOUNDS } from './map-backgrounds';
import { monthRange } from './map-utils';
import { validTimelineDate, clampTimelineDate, HISTORY_END } from './timeline-utils';

const layerNames = ['modis', 'viirs', 'grid', 'coordinates', 'wind', 'boundaries'];

export function readMapView(url) {
  try {
    const parsed = new URL(url);
    // New links use ordinary query parameters; keep older #tanaw links working.
    const values = parsed.searchParams.get('tanaw') === '1'
      ? parsed.searchParams : new URLSearchParams(parsed.hash.slice(1));
    if (values.get('tanaw') !== '1') return null;
    const latText = values.get('lat');
    const lonText = values.get('lon');
    const zoomText = values.get('zoom');
    const latitude = Number(latText), longitude = Number(lonText), zoom = Number(zoomText);
    if (!latText?.trim() || !lonText?.trim() || !zoomText?.trim() ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(zoom) ||
        latitude < PHILIPPINES_BOUNDS[0][0] || latitude > PHILIPPINES_BOUNDS[1][0] ||
        longitude < PHILIPPINES_BOUNDS[0][1] || longitude > PHILIPPINES_BOUNDS[1][1] || zoom < 5 || zoom > 18) return null;
    const month = values.get('month');
    const sensor = values.get('sensor');
    const basemap = values.get('basemap');
    const date = values.get('date');
    const days = Number(values.get('days'));
    const layerFlags = values.get('layers');
    const layers = {};
    layerNames.forEach((name, index) => { layers[name] = /^[01]{6}$/.test(layerFlags || '') ? layerFlags[index] === '1' : ['modis', 'viirs', 'coordinates', 'boundaries'].includes(name); });
    return {
      center: [latitude, longitude], zoom,
      month: monthRange(month || '') ? month : '2026-11',
      sensor: ['MODIS', 'VIIRS'].includes(sensor) ? sensor : '',
      basemap: Object.hasOwn(MAP_BACKGROUNDS, basemap) ? basemap : 'satellite',
      layers, timelineOpen: values.get('timeline') === '1',
      timelineDate: validTimelineDate(date) ? clampTimelineDate(date) : HISTORY_END,
      timelineDays: [1, 3, 7].includes(days) ? days : 1,
    };
  } catch { return null; }
}

export function createMapViewLink(url, map, settings) {
  if (!map) throw new Error('The map is not ready yet.');
  const center = map.getCenter();
  const values = new URLSearchParams({
    tanaw: '1', lat: center.lat.toFixed(5), lon: center.lng.toFixed(5), zoom: map.getZoom().toFixed(2),
    month: settings.month, sensor: settings.sensor || '', basemap: settings.basemap,
    layers: layerNames.map(name => settings.layers[name] !== false && (settings.layers[name] || name === 'boundaries') ? '1' : '0').join(''),
    timeline: settings.timelineOpen ? '1' : '0', date: settings.timelineDate, days: String(settings.timelineDays),
  });
  const link = new URL(url);
  // Build from the app address, omitting unrelated query strings or old fragments.
  link.search = values.toString();
  link.hash = '';
  return link.href;
}

export function shareTargets(link) {
  const text = 'Explore this TANAW thermal activity map';
  const subject = 'TANAW map view';
  const body = text + '\n\n' + link;
  return {
    email: 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n')),
    gmail: 'https://mail.google.com/mail/?' + new URLSearchParams({ view: 'cm', fs: '1', su: subject, body }),
    outlook: 'https://outlook.live.com/mail/0/deeplink/compose?' + new URLSearchParams({ subject, body }),
    // Direct official sharing page also offers a WhatsApp Web fallback on desktop.
    whatsapp: 'https://api.whatsapp.com/send?' + new URLSearchParams({ text: text + '\n' + link }),
    telegram: 'https://t.me/share/url?' + new URLSearchParams({ url: link, text }),
    facebook: 'https://www.facebook.com/sharer/sharer.php?' + new URLSearchParams({ u: link }),
  };
}

export function isLocalViewLink(link) {
  const host = new URL(link).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}
