// Map sources copied from Desktop/Nagales/app.js. No observation data is imported.
export const PHILIPPINES_BOUNDS = [[4.58, 114.27], [21.13, 126.62]];
export const PROVINCE_BOUNDARY_SOURCE = 'https://fmbfsd.denr.gov.ph/server/rest/services/Hosted/Provincial_Boundary/FeatureServer/0';

export const MAP_BACKGROUNDS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &middot; Sources: Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
  },
  topographic: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &middot; Sources: Esri, Garmin, USGS',
    maxNativeZoom: 18,
  },
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  light: {
    // MapTiler Dataviz Light: 512px raster tiles with Leaflet's matching zoom offset.
    url: 'https://api.maptiler.com/maps/dataviz-v4-light/{z}/{x}/{y}.png?key=o7Tvxatue0cBhvpv1oDU',
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    tileSize: 512,
    zoomOffset: -1,
    maxNativeZoom: 22,
  },
};

// Keep the existing dark option, using the same street tiles and CSS appearance.
MAP_BACKGROUNDS.dark = MAP_BACKGROUNDS.street;
