// Provincial outlines from the reference map. This layer never filters observation data.
// A local GeoJSON copy avoids depending on the source service's browser CORS settings.
import React, { useEffect, useState } from 'react';
import { GeoJSON, Pane } from 'react-leaflet';
import { PROVINCE_BOUNDARY_SOURCE } from '../lib/map-backgrounds';

export default function ProvinceBoundaries({ enabled }) {
  const [boundaries, setBoundaries] = useState(null);
  const [error, setError] = useState('');

  useEffect(function loadProvinceOutlines() {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 15000);

    async function load() {
      try {
        const url = import.meta.env.BASE_URL + 'assets/philippines-provinces.geojson';
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Boundary file unavailable');
        const data = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) {
          throw new Error('Invalid boundary file');
        }
        if (!cancelled) setBoundaries(data);
      } catch {
        if (!cancelled) setError('Province outlines could not load. The background map and observations remain available.');
      } finally {
        clearTimeout(timeout);
      }
    }
    load();

    return function stopLoading() {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  function showProvinceName(feature, layer) {
    // Use textContent so source labels are never interpreted as HTML.
    const label = document.createElement('span');
    const province = feature.properties?.province || '';
    const region = feature.properties?.region || '';
    label.textContent = region ? province + ' - ' + region : province;
    layer.bindTooltip(label, { sticky: true, className: 'province-tooltip' });
  }

  if (!enabled) return null;
  if (error) return <div className="workspace-warning boundary-map-notice" role="status">{error}</div>;
  if (!boundaries) return null;

  return (
    <Pane name="province-outlines" style={{ zIndex: 350 }}>
      <GeoJSON
        data={boundaries}
        pane="province-outlines"
        attribution={'Boundaries: <a href="' + PROVINCE_BOUNDARY_SOURCE + '">DENR provincial boundary service</a>'}
        style={{ color: '#FFE08A', weight: 1, opacity: 0.85, fillColor: '#D8C982', fillOpacity: 0.08 }}
        onEachFeature={showProvinceName}
      />
    </Pane>
  );
}
