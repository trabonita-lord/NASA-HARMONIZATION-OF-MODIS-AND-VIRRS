// Overview no longer creates a second map. The workspace map stays behind this panel.
import React from 'react';
import { Layers, MapPinned, CalendarDays, GitCompareArrows } from 'lucide-react';

export default function OverviewPage({ onOpenLayers }) {
  return (
    <section className="workspace-overview">
      <div className="overview-intro-icon"><MapPinned size={23} /></div>
      <h2>A wider view of thermal activity</h2>
      <p>Explore MODIS and VIIRS observations across the Philippines. Your map stays in view while you open the calendar, compare sensors, or inspect data sources.</p>
      <button type="button" className="workspace-primary-button" onClick={onOpenLayers}><Layers size={16} /> Open map layers</button>
      <div className="overview-feature"><Layers size={18} /><div><b>Build your map</b><span>Choose a background, sensor layers, and coordinate overlays.</span></div></div>
      <div className="overview-feature"><CalendarDays size={18} /><div><b>Explore a date</b><span>Your activity calendar and date popup are available in the Calendar panel.</span></div></div>
      <div className="overview-feature"><GitCompareArrows size={18} /><div><b>Compare observations</b><span>Review MODIS and VIIRS counts for the current fetched sample.</span></div></div>
      <p className="workspace-footnote">Up to 1,500 observations are displayed. Observation counts do not represent unique fires.</p>
    </section>
  );
}
