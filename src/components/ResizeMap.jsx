// Map helper: refresh tiles when the panel changes size.
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}
