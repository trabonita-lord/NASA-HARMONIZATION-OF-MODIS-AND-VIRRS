// INTRO TIMING: wings and flight -> exact logo -> dashboard.
// 2700ms: logo reveal. 4100ms: fade. 4600ms: dashboard.
import React, { useEffect, useState } from 'react';
import FireOwl from './FireOwl';
import FireEmbers from './FireEmbers';
import './splash-screen.css';

export default function SplashScreen({ onFinish }) {
  const [logoReady, setLogoReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const logoUrl = import.meta.env.BASE_URL + 'assets/fire_owl.png';

  function startIntro() {
    setLogoReady(true);
  }

  useEffect(function runIntro() {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let fadeTimer;
    let finishTimer;

    if (reduceMotion) {
      finishTimer = setTimeout(function skipIntroMotion() { onFinish(false); }, 0);
    } else if (logoReady) {
      fadeTimer = setTimeout(function fadeIntro() { setIsLeaving(true); }, 4100);
      finishTimer = setTimeout(function showDashboard() { onFinish(false); }, 4600);
    }

    // A missing image must not block the website.
    const fallbackTimer = setTimeout(function releaseDashboard() { onFinish(false); }, 7000);

    return function cleanUpIntro() {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
      clearTimeout(fallbackTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [logoReady, onFinish]);

  let screenClass = 'splash-screen fire-owl-intro';
  if (logoReady) screenClass = screenClass + ' fire-owl-ready';
  if (isLeaving) screenClass = screenClass + ' splash-screen-leaving';

  return (
    <div className={screenClass} role="status" aria-live="polite">
      <div className="fire-owl-background-glow" aria-hidden="true" />
      <FireEmbers active={logoReady} />
      <FireOwl logoUrl={logoUrl} onLogoReady={startIntro} />
      <div className="fire-owl-brand">
        <div className="fire-owl-brand-rule" aria-hidden="true" />
        <h1>TANAW</h1>
        <p>THERMAL ACTIVITY WATCH</p>
      </div>
    </div>
  );
}
