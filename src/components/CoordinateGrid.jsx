// The latitude/longitude layer adapts to the visible map and zoom level.
import React, { useState } from 'react';
import { Marker, Polyline, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { formatCoordinate, gridValues } from '../lib/map-utils';

export default function CoordinateGrid() {
  const [revision, setRevision] = useState(0);
  const map = useMapEvents({
    moveend: updateGrid,
    zoomend: updateGrid,
    resize: updateGrid,
  });

  function updateGrid() {
    setRevision(previous => previous + 1);
  }

  const bounds = map.getBounds();
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  const west = Math.max(-180, bounds.getWest());
  const east = Math.min(180, bounds.getEast());
  const values = gridValues(south, north, west, east, map.getZoom());
  const lineStyle = { color: '#D3EFF7', weight: 1, opacity: 0.45, dashArray: '4 6' };

  function label(text) {
    return divIcon({
      className: 'coordinate-grid-label',
      html: '<span>' + text + '</span>',
      iconSize: [78, 20],
      iconAnchor: [0, 10],
    });
  }

  return (
    <React.Fragment key={'grid-' + revision}>
      {values.latitudes.map(latitude => (
        <React.Fragment key={'latitude-' + latitude}>
          <Polyline positions={[[latitude, west], [latitude, east]]} pathOptions={lineStyle} interactive={false} />
          <Marker position={[latitude, west + (east - west) * 0.12]} icon={label(formatCoordinate(latitude, 'latitude'))} interactive={false} keyboard={false} />
        </React.Fragment>
      ))}
      {values.longitudes.map(longitude => (
        <React.Fragment key={'longitude-' + longitude}>
          <Polyline positions={[[south, longitude], [north, longitude]]} pathOptions={lineStyle} interactive={false} />
          <Marker position={[north - (north - south) * 0.18, longitude]} icon={label(formatCoordinate(longitude, 'longitude'))} interactive={false} keyboard={false} />
        </React.Fragment>
      ))}
    </React.Fragment>
  );
}
