// Colors come from the EDIT COLORS HERE section at the top of app.css.
// Refresh after editing the palette to update chart and map colors too.
export function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    modis: styles.getPropertyValue('--sensor-modis').trim(),
    viirs: styles.getPropertyValue('--sensor-viirs').trim(),
    text: styles.getPropertyValue('--text-primary').trim(),
  };
}
