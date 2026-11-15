// Theme-colored location flag and compact glass address card. Observation markers stay unchanged.
import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { X } from 'lucide-react';
import { divIcon, DomEvent } from 'leaflet';

const locationIcon = divIcon({
  className: 'location-pin-icon',
  // The pole's base marks the exact coordinates; the flag sits above them.
  html: '<svg class="location-flag-marker" viewBox="0 0 32 36" aria-hidden="true"><path class="location-flag-cloth" d="M8 5 C15 0 20 10 28 5 L28 20 C20 25 15 15 8 20 Z"/><path class="location-flag-pole" d="M8 3 V33 M4 33 H12"/></svg>',
  iconSize: [32, 36],
  iconAnchor: [8, 33],
  popupAnchor: [8, -30],
});

export default function LocationPin({ place, active, selectionVersion, saved, onSave, onRemove }) {
  const markerRef = useRef(null);
  useEffect(function openSelectedCard() {
    if (active && markerRef.current) markerRef.current.openPopup();
  }, [active, selectionVersion]);

  return (
    <Marker ref={markerRef} position={[place.latitude, place.longitude]} icon={locationIcon} title={place.title} bubblingMouseEvents={false} zIndexOffset={1000}>
      <Popup pane="location-cards" className="location-tool-popup" minWidth={190} maxWidth={260} autoPan={false}>
        <h3>{place.title}</h3>
        {place.address && <p>{place.address}</p>}
        <div className="location-card-coordinates">Lat: {place.latitude.toFixed(4)}, Lon: {place.longitude.toFixed(4)}</div>
        <button type="button" className="location-action-button" disabled={saved} onClick={() => onSave(place)}>
          {saved ? 'LOCATION SAVED' : '+ SAVE LOCATION'}
        </button>
        <button type="button" className="location-remove-flag-button" onClick={event => { event.preventDefault(); DomEvent.stopPropagation(event.nativeEvent); onRemove(place.key); }} aria-label={'Remove flag for ' + place.title}>
          <X size={14} /> Remove flag from map
        </button>
      </Popup>
    </Marker>
  );
}
