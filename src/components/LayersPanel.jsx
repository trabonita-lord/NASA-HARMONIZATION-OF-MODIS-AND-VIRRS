// Only these controls change visibility. The existing monthly data is untouched.
import React from 'react';
import { Layers, Globe2, Grid2X2, MapPin } from 'lucide-react';
import LocationSearch from './LocationSearch';

export default function LayersPanel({ layers, onChangeLayer, basemap, onChangeBasemap, onLocate, modis, viirs }) {
  return (
    <div className="layers-panel">
      <section className="layer-group">
        <h3><Layers size={16} /> Fires / Hotspots</h3>
        <p className="layer-description">Show or hide sensors on the map.</p>
        <label className="layer-option">
          <input type="checkbox" checked={layers.modis} onChange={event => onChangeLayer('modis', event.target.checked)} />
          <span className="sensor-swatch modis-swatch" />
          <span><b>MODIS</b><small>Terra & Aqua · displayed sample</small></span>
          <span className="layer-count">{modis.toLocaleString()}</span>
        </label>
        <label className="layer-option">
          <input type="checkbox" checked={layers.viirs} onChange={event => onChangeLayer('viirs', event.target.checked)} />
          <span className="sensor-swatch viirs-swatch" />
          <span><b>VIIRS</b><small>Satellite observations · displayed sample</small></span>
          <span className="layer-count">{viirs.toLocaleString()}</span>
        </label>
      </section>

      <section className="layer-group">
        <h3><Grid2X2 size={16} /> Overlays</h3>
        <label className="layer-option">
          <input type="checkbox" checked={layers.boundaries !== false} onChange={event => onChangeLayer('boundaries', event.target.checked)} />
          <span><b>Provincial outlines</b><small>Philippines - DENR boundary layer</small></span>
        </label>
        <label className="layer-option">
          <input type="checkbox" checked={layers.grid} onChange={event => onChangeLayer('grid', event.target.checked)} />
          <span><b>Latitude / longitude grid</b><small>Coordinate lines and degree labels</small></span>
        </label>
        <label className="layer-option">
          <input type="checkbox" checked={layers.coordinates} onChange={event => onChangeLayer('coordinates', event.target.checked)} />
          <span><b>Coordinate readout</b><small>Move the pointer or tap the map</small></span>
        </label>
      </section>

      <section className="layer-group">
        <h3><Globe2 size={16} /> Background map</h3>
        <label className="basemap-choice"><input type="radio" name="basemap" value="satellite" checked={basemap === 'satellite'} onChange={() => onChangeBasemap('satellite')} /><span className="basemap-thumbnail satellite-thumbnail" /><span>Satellite<small>Esri World Imagery</small></span></label>
        <label className="basemap-choice"><input type="radio" name="basemap" value="topographic" checked={basemap === 'topographic'} onChange={() => onChangeBasemap('topographic')} /><span className="basemap-thumbnail topographic-thumbnail" /><span>Topographic<small>Esri World Topographic Map</small></span></label>
        <label className="basemap-choice"><input type="radio" name="basemap" value="light" checked={basemap === 'light'} onChange={() => onChangeBasemap('light')} /><span className="basemap-thumbnail light-thumbnail" /><span>Light<small>OpenStreetMap / CARTO</small></span></label>
        <label className="basemap-choice"><input type="radio" name="basemap" value="street" checked={basemap === 'street'} onChange={() => onChangeBasemap('street')} /><span className="basemap-thumbnail street-thumbnail" /><span>Street map<small>OpenStreetMap</small></span></label>
        <label className="basemap-choice"><input type="radio" name="basemap" value="dark" checked={basemap === 'dark'} onChange={() => onChangeBasemap('dark')} /><span className="basemap-thumbnail dark-thumbnail" /><span>Dark map<small>OpenStreetMap with a dark appearance</small></span></label>
        <p className="layer-description">Background imagery is separate from the selected observation month.</p>
      </section>

      <section className="layer-group">
        <h3><MapPin size={16} /> Go to a location</h3>
        <LocationSearch onLocate={onLocate} />
      </section>
    </div>
  );
}
