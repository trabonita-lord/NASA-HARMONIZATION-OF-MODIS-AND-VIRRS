// Map helper: fit the view around the observation coordinates.
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function FitMap({ records }) {
  const map = useMap();

  useEffect(() => {
    if (records.length) {
      const latitudes = records.map(observation => observation.latitude);
      const longitudes = records.map(observation => observation.longitude);

      map.fitBounds(
        [
          [Math.min(...latitudes), Math.min(...longitudes)],
          [Math.max(...latitudes), Math.max(...longitudes)],
        ],
        {
          padding: [24, 24],
          maxZoom: 8,
        }
      );
    }
  }, [records, map]);

  return null;
}
