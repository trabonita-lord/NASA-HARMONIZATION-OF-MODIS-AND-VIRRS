// Theme-colored target marker and compact glass address card. Observation markers stay unchanged.
import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';

const locationIcon = divIcon({
  className: 'location-pin-icon',
  html: '<span class="location-map-marker"><span class="location-marker-core"></span></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

export default function LocationPin({ place, active, saved, onSave }) {
  const markerRef = useRef(null);
  useEffect(function openSelectedCard() {
    if (active && markerRef.current) markerRef.current.openPopup();
  }, [active]);

  return (
    <Marker ref={markerRef} position={[place.latitude, place.longitude]} icon={locationIcon} title={place.title} bubblingMouseEvents={false} zIndexOffset={1000}>
      <Popup pane="location-cards" className="location-tool-popup" minWidth={190} maxWidth={260} autoPan={false}>
        <h3>{place.title}</h3>
        {place.address && <p>{place.address}</p>}
        <div className="location-card-coordinates">Lat: {place.latitude.toFixed(4)}, Lon: {place.longitude.toFixed(4)}</div>
        <button type="button" className="location-action-button" disabled={saved} onClick={() => onSave(place)}>
          {saved ? 'LOCATION SAVED' : '+ SAVE LOCATION'}
        </button>
      </Popup>
    </Marker>
  );
}
