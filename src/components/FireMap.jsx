// Edit the map, tiles, marker colors, and marker popups here.
import React from 'react';
import { getThemeColors } from '../theme';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import FitMap from './FitMap';
import ResizeMap from './ResizeMap';

export default function FireMap({ records }) {
  const theme = getThemeColors();
  // Only place observations with numeric coordinates on the map.
  function hasValidCoordinates(observation) {
    const hasLatitude = Number.isFinite(Number(observation.latitude));
    const hasLongitude = Number.isFinite(Number(observation.longitude));
    return hasLatitude && hasLongitude;
  }

  const validObservations = records.filter(hasValidCoordinates);

  function getMarkerColor(sensor) {
    if (sensor === 'MODIS') {
      return theme.modis;
    }
    return theme.viirs;
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[12.5, 122.5]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ResizeMap />
        <FitMap records={records} />

        {validObservations.map(function drawMarker(observation) {
          return (
            <CircleMarker
              key={observation.id}
              center={[observation.latitude, observation.longitude]}
              radius={4}
              pathOptions={{
                color: getMarkerColor(observation.sensor),
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <Popup>
                <strong>{observation.sensor}</strong> Â· {observation.satellite}
                <br />
                {observation.acq_date}
                <br />
                FRP: {observation.frp ?? 'N/A'} MW
                <br />
                Confidence: {observation.confidence ?? 'N/A'}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
