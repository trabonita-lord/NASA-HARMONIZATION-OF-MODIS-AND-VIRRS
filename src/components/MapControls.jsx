import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { control } from 'leaflet';
import { observationBounds } from '../lib/map-utils';

// Fit when a new month/sensor dataset arrives; layer visibility never resets the view.
export function FitObservationView({ records, enabled = true }) {
  const map = useMap();
  useEffect(function fitNewRecords() {
    if (!enabled) return;
    const bounds = observationBounds(records);
    if (!bounds) return;
    const size = map.getSize();
    const rightPadding = size.x > 1000 ? 420 : 35;
    const bottomPadding = size.y > 550 ? 85 : 35;
    map.fitBounds(bounds, {
      paddingTopLeft: [90, 60],
      paddingBottomRight: [rightPadding, bottomPadding],
      maxZoom: 8,
      animate: false,
    });
  }, [records, map, enabled]);
  return null;
}
