// Capture the Leaflet viewport, not the sidebar, toolbar, or location form.
export async function captureMap(map, signal) {
  if (!map) throw new Error('The map is not ready yet.');
  const container = map.getContainer();
  const deadline = Date.now() + 12000;
  while (true) {
    if (signal.aborted || !container.isConnected) throw new DOMException('Cancelled', 'AbortError');
    let loading = false;
    map.eachLayer(layer => { if (typeof layer.isLoading === 'function' && layer.isLoading()) loading = true; });
    if (!loading) break;
    if (Date.now() > deadline) throw new Error('Map tiles are still loading. Wait a moment and try Capture again.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  // Refuse an incomplete/blocked background instead of downloading a blank map.
  const bounds = container.getBoundingClientRect();
  const tiles = [...container.querySelectorAll('img.leaflet-tile')].filter(image => {
    const box = image.getBoundingClientRect();
    return box.right > bounds.left && box.left < bounds.right && box.bottom > bounds.top && box.top < bounds.bottom;
  });
  if (!tiles.length || tiles.some(image => !image.complete || !image.naturalWidth)) throw new Error('Some map tiles are unavailable. Wait or select another map background before capturing.');
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  try {
    const context = probe.getContext('2d');
    for (const image of tiles) { context.drawImage(image, 0, 0, 1, 1); context.getImageData(0, 0, 1, 1); }
  } catch {
    throw new Error('This background does not permit image export. Select another background and try again.');
  }
  const { default: html2canvas } = await import('html2canvas');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const darkMap = container.closest('.workspace-map')?.dataset.basemap === 'dark';
  const sourceTiles = new Map([...container.querySelectorAll('img.leaflet-tile')].map(image => [image.src, image]));
  const canvas = await html2canvas(container, {
    useCORS: true, allowTaint: false, logging: false, imageTimeout: 12000,
    backgroundColor: '#0D2633', scale: Math.min(2, window.devicePixelRatio || 1),
    ignoreElements: element => element.matches('.leaflet-control-container, .location-tool-panel, .coordinate-readout, .wind-overlay-status'),
    onclone: clonedDocument => {
      if (!darkMap) return;
      // html2canvas does not render CSS filters. Bake the dark filter into tile
      // pixels in the temporary clone, keeping hotspots and labels unchanged.
      const tilePane = clonedDocument.querySelector('.workspace-map .leaflet-tile-pane');
      if (!tilePane) return;
      tilePane.style.filter = 'none';
      for (const image of tilePane.querySelectorAll('img.leaflet-tile')) {
        const source = sourceTiles.get(image.src);
        if (!source?.naturalWidth) continue;
        const tile = clonedDocument.createElement('canvas');
        tile.width = source.naturalWidth;
        tile.height = source.naturalHeight;
        tile.style.cssText = image.style.cssText;
        tile.className = image.className;
        const context = tile.getContext('2d');
        context.filter = 'invert(1) hue-rotate(180deg) brightness(0.72) contrast(0.9) saturate(0.6)';
        context.drawImage(source, 0, 0);
        image.replaceWith(tile);
      }
    },
  });
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The browser could not create the map image. Please try again.');
  return blob;
}

export function downloadMap(blob, period) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'TANAW-map-' + period.replace(/[^\d-]/g, '') + '.png';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
