// Compact source credits replace the long default Leaflet attribution strip.
import React, { useEffect, useRef, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { DomEvent } from 'leaflet';
import './map-credits.css';

export default function MapCredits() {
  const [credits, setCredits] = useState([]);
  const controlRef = useRef(null);
  const map = useMapEvents({ layeradd: updateSources, layerremove: updateSources });

  function collectSources() {
    const sources = new Set();
    map.eachLayer(layer => {
      const attribution = layer.getAttribution?.();
      if (attribution) sources.add(attribution);
    });
    const next = [...sources];
    setCredits(previous => previous.join('|') === next.join('|') ? previous : next);
  }

  function updateSources(event) {
    if (event.layer.getAttribution?.()) collectSources();
  }

  useEffect(function initializeCredits() {
    collectSources();
    if (controlRef.current) {
      DomEvent.disableClickPropagation(controlRef.current);
      DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, [map]);

  return (
    <details className="map-credits" ref={controlRef} onClick={event => event.stopPropagation()}>
      <summary aria-label="Show map source credits">Map credits</summary>
      <div className="map-credits-content" aria-label="Map data sources">
        {!credits.length && <span>Source credits are loading.</span>}
        {/* Attribution HTML comes from the same app-defined layer options used by Leaflet. */}
        {credits.map(credit => <div key={credit} dangerouslySetInnerHTML={{ __html: credit }} />)}
      </div>
    </details>
  );
}
