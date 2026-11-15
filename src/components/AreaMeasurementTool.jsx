import React, { useEffect, useRef } from 'react';
import { CircleMarker, Polygon, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { formatAreaMeasurement, polygonAreaSquareMeters } from '../lib/area-measurement';

export default function AreaMeasurementTool({ active, points, setPoints }) {
  const map = useMap();
  const wasActive = useRef(false);
  const area = polygonAreaSquareMeters(points);

  useEffect(() => {
    if (active && !wasActive.current) setPoints([]);
    wasActive.current = active;
    if (active) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    return () => map.doubleClickZoom.enable();
  }, [active, map]);

  useMapEvents({
    click(event) {
      if (active) setPoints(previous => [...previous, [event.latlng.lat, event.latlng.lng]]);
    },
    keydown(event) {
      if (active && event.originalEvent.key === 'Escape') setPoints(previous => previous.slice(0, -1));
    },
  });

  if (points.length === 0) return null;
  return (
    <>
      {points.length >= 3 && (
        <Polygon positions={points} pathOptions={{ color: '#FFD166', weight: 3, fillColor: '#FFD166', fillOpacity: 0.22 }} />
      )}
      {points.map((point, index) => <CircleMarker key={`${point[0]}-${point[1]}-${index}`} center={point} radius={4} pathOptions={{ color: '#102433', weight: 2, fillColor: '#FFD166', fillOpacity: 1 }}>{index === points.length - 1 && <Tooltip permanent direction="top" className="area-measure-tooltip">{points.length < 3 ? `Add ${3 - points.length} more point${3 - points.length === 1 ? '' : 's'} to measure` : `Area: ${formatAreaMeasurement(area)}`}</Tooltip>}</CircleMarker>)}
    </>
  );
}
