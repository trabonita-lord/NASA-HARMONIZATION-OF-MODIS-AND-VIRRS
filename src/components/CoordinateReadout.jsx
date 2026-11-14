// Local state keeps cursor movement from re-rendering the entire dashboard.
import React, { useEffect, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { Crosshair } from 'lucide-react';
import { formatCoordinate } from '../lib/map-utils';

export default function CoordinateReadout() {
  const [location, setLocation] = useState({ lat: 12.5, lng: 122.5 });
  const map = useMapEvents({
    mousemove: updateLocation,
    click: updateLocation,
    moveend: function updateCenter(event) {
      setLocation(event.target.getCenter());
    },
  });

  // Sync immediately when this overlay is enabled after panning the map.
  useEffect(function showCurrentCenter() {
    setLocation(map.getCenter());
  }, [map]);

  function updateLocation(event) {
    setLocation(event.latlng);
  }

  return (
    <div className="coordinate-readout" aria-label="Map latitude and longitude">
      <Crosshair size={15} aria-hidden="true" />
      <span><small>LAT</small> {formatCoordinate(location.lat, 'latitude')}</span>
      <span><small>LON</small> {formatCoordinate(location.lng, 'longitude')}</span>
    </div>
  );
}
