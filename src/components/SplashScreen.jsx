// STARTUP INTRO: based on the supplied logo-centered HTML splash.
// Change these three values to edit the timing; all styling is in splash-screen.css.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import './splash-screen.css';

const MINIMUM_INTRO_MS = 1800;
const MAXIMUM_WAIT_MS = 6000;
const EXIT_DURATION_MS = 360;

export default function SplashScreen({ onFinish, ready = true }) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [reducedMotion] = useState(function readMotionPreference() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const timers = useRef([]);
  const exitStarted = useRef(false);
  const completed = useRef(false);
  const finishCallback = useRef(onFinish);
  finishCallback.current = onFinish;
  const logoUrl = import.meta.env.BASE_URL + 'assets/tanaw-owl-flame.png';

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function finishIntro() {
    if (completed.current) return;
    completed.current = true;
    finishCallback.current(false);
  }

  function leaveIntro() {
    if (exitStarted.current || completed.current) return;
    exitStarted.current = true;
    clearTimers();
    setIsLeaving(true);
    timers.current.push(setTimeout(finishIntro, reducedMotion ? 0 : EXIT_DURATION_MS));
  }

  useEffect(function startIntro() {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function skipWithEscape(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        leaveIntro();
      }
    }
    document.addEventListener('keydown', skipWithEscape);
    timers.current.push(setTimeout(() => setMinimumElapsed(true), reducedMotion ? 0 : MINIMUM_INTRO_MS));
    // Slow or unavailable data/logo must never leave the workspace behind an endless intro.
    timers.current.push(setTimeout(leaveIntro, reducedMotion ? 120 : MAXIMUM_WAIT_MS));

    return function cleanUpIntro() {
      clearTimers();
      document.removeEventListener('keydown', skipWithEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [reducedMotion]);

  useEffect(function handOffWhenReady() {
    if (ready && minimumElapsed) leaveIntro();
  }, [ready, minimumElapsed]);

  let screenClass = 'splash-screen tanaw-launch';
  if (isLeaving) screenClass += ' tanaw-launch-leaving';

  return (
    <div className={screenClass} role="region" aria-label="TANAW introduction">
      <div className="launch-ambient" aria-hidden="true" />
      <div className="launch-grid" aria-hidden="true" />
      <section className="launch-content" aria-label="Opening your workspace">
        <div className="launch-wordmark">
          {(!logoLoaded || logoFailed) && <h1>TANAW</h1>}
          {!logoFailed && <img src={logoUrl} className={logoLoaded ? 'launch-logo-ready' : 'launch-logo-loading'} aria-hidden={!logoLoaded} alt="TANAW - Thermal Activity Network and Analytics Watch" width={870} height={272} fetchPriority="high" decoding="async" onLoad={() => setLogoLoaded(true)} onError={() => setLogoFailed(true)} />}
        </div>
        <p className="launch-tagline">THERMAL AND NETWORK ANALYTICS WATCH</p>
        {/* Decorative activity indicator, not a fabricated data-loading percentage. */}
        <div className="launch-progress" aria-hidden="true"><span /></div>
        <p className="launch-status" role="status" aria-live="polite">{isLeaving ? 'Opening your workspace' : 'Preparing the observatory'}</p>
      </section>
    </div>
  );
}
