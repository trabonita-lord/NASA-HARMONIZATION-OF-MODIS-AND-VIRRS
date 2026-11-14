import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { control } from 'leaflet';
import { observationBounds } from '../lib/map-utils';

// Fit when a new month/sensor dataset arrives; layer visibility never resets the view.
export function FitObservationView({ records }) {
  const map = useMap();
  useEffect(function fitNewRecords() {
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
  }, [records, map]);
  return null;
}

export function MapScale() {
  const map = useMap();
  useEffect(function addScale() {
    const scale = control.scale({ position: 'bottomleft', imperial: false });
    scale.addTo(map);
    return function removeScale() { scale.remove(); };
  }, [map]);
  return null;
}
