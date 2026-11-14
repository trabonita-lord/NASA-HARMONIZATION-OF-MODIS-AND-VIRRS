// One persistent map for the full workspace. All existing observations remain unchanged.
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import { getThemeColors } from '../theme';
import { validLocation } from '../lib/map-utils';
import ResizeMap from './ResizeMap';
import LocationTool from './LocationTool';
import WindLayer from './WindLayer';
import ProvinceBoundaries from './ProvinceBoundaries';
import { MAP_BACKGROUNDS, PHILIPPINES_BOUNDS } from '../lib/map-backgrounds';
import CoordinateGrid from './CoordinateGrid';
import CoordinateReadout from './CoordinateReadout';
import { FitObservationView } from './MapControls';

export default function FireMap({ records, layers, basemap, mapReference, selectedLocation, onBasemapWarning, locationToolOpen, onCloseLocationTool, timelineActive = false }) {
  const theme = getThemeColors();
  const [failedBasemap, setFailedBasemap] = useState('');
  useEffect(function resetFallback() { setFailedBasemap(''); }, [basemap]);

  // Only the map background and outlines come from the supplied reference.
  let displayedBasemap = basemap;
  if (!MAP_BACKGROUNDS[displayedBasemap]) displayedBasemap = 'street';
  if (failedBasemap === basemap) displayedBasemap = 'street';
  const background = MAP_BACKGROUNDS[displayedBasemap];

  function handleTileError() {
    if (displayedBasemap !== 'street') {
      setFailedBasemap(basemap);
      onBasemapWarning('Selected background could not load. The street map is shown instead.');
    } else {
      onBasemapWarning('Background tiles could not load. Check the connection or select another background in Layers.');
    }
  }

  const visibleRecords = records.filter(function isVisible(record) {
    if (!validLocation(record.latitude, record.longitude)) return false;
    if (record.kind === 'forecast' && record.sensor === 'FORECAST') return true;
    if (record.sensor === 'MODIS') return layers.modis;
    if (record.sensor === 'VIIRS') return layers.viirs;
    return false;
  });

  return (
    <div className="map-container workspace-map" data-basemap={displayedBasemap}>
      <MapContainer
        ref={mapReference}
        attributionControl={false}
        center={[12.5, 122.4]}
        zoom={5.65}
        minZoom={5}
        maxZoom={18}
        maxBounds={PHILIPPINES_BOUNDS}
        maxBoundsViscosity={1}
        zoomSnap={0.25}
        preferCanvas={true}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer key={displayedBasemap} {...background} maxZoom={18} noWrap={true} eventHandlers={{ tileerror: handleTileError }} />
        <ProvinceBoundaries enabled={layers.boundaries !== false} />
        <ResizeMap />
        <FitObservationView records={records} enabled={!timelineActive} />
        <WindLayer enabled={Boolean(layers.wind)} paused={timelineActive} hideStatus={locationToolOpen} />
        <LocationTool open={locationToolOpen} onClose={onCloseLocationTool} />
        {layers.grid && <CoordinateGrid />}
        {layers.coordinates && <CoordinateReadout />}
        {selectedLocation && (
          <Circle center={selectedLocation} radius={3000} pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: '#FF5722', fillOpacity: 0.3 }} />
        )}

        {visibleRecords.map(function drawObservation(record) {
          const forecast = record.kind === 'forecast';
          let color = theme.viirs;
          if (record.sensor === 'MODIS') color = theme.modis;
          if (forecast) color = '#D4A3FF';
          return (
            <CircleMarker key={record.id} center={[Number(record.latitude), Number(record.longitude)]} radius={forecast ? 7 : 4} pathOptions={{ color, fillColor: color, fillOpacity: forecast ? 0.12 : 0.85, weight: forecast ? 2 : 1, dashArray: forecast ? '3 3' : undefined }}>
              <Popup>
                {forecast ? (
                  <>
                    <strong>Predicted hotspot</strong><br />
                    Forecast date: {record.acq_date}<br />
                    Latitude: {Number(record.latitude).toFixed(4)}<br />
                    Longitude: {Number(record.longitude).toFixed(4)}<br />
                    {record.probability != null && <>Model probability: {(record.probability * 100).toFixed(1)}%<br /></>}
                    Model: {record.model}<br />
                    Issued: {record.issued_at}<br />
                    Model output; not a satellite observation.
                  </>
                ) : (<>
                <strong>{record.sensor}</strong> · {record.satellite}<br />
                {record.acq_date}<br />
                Latitude: {Number(record.latitude).toFixed(4)}<br />
                Longitude: {Number(record.longitude).toFixed(4)}<br />
                FRP: {record.frp ?? 'N/A'} MW<br />
                Confidence: {record.confidence ?? 'N/A'}
                </>)}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
