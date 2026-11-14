// Go to a typed coordinate. This does not request device location permissions.
import React, { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { parseLocation } from '../lib/map-utils';

export default function LocationSearch({ onLocate }) {
  const [latitude, setLatitude] = useState('12.5');
  const [longitude, setLongitude] = useState('122.5');
  const [error, setError] = useState('');

  function goToLocation(event) {
    event.preventDefault();
    const result = parseLocation(latitude, longitude);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError('');
    onLocate(result.latitude, result.longitude);
  }

  return (
    <form className="location-search" onSubmit={goToLocation}>
      <div className="coordinate-inputs">
        <label>Latitude<input aria-label="Go to latitude" inputMode="decimal" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
        <label>Longitude<input aria-label="Go to longitude" inputMode="decimal" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
      </div>
      <button type="submit" className="workspace-primary-button"><LocateFixed size={16} /> Go to coordinates</button>
      {error && <p className="location-error" role="alert">{error}</p>}
    </form>
  );
}
