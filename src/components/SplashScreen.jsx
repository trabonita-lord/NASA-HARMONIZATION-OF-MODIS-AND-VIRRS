// VIDEO INTRO: Replaces the previous owl animation; App.jsx still renders one splash.
// Edit timings below. Styles live only in splash-screen.css.
import React, { useEffect, useRef, useState } from 'react';
import './splash-screen.css';

const VIDEO_CUTOFF_SECONDS = 3.8;
const LOGO_FALLBACK_MS = 4200;
const FADE_START_MS = 5600;
const INTRO_FINISH_MS = 6300;

export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);
  const timersRef = useRef([]);
  const phaseRef = useRef('video');
  const [logoVisible, setLogoVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [reducedMotion] = useState(function readMotionPreference() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const videoUrl = import.meta.env.BASE_URL + 'assets/tanaw-intro.mp4';
  const logoUrl = import.meta.env.BASE_URL + 'assets/fire_owl.png';

  function clearIntroTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedule(callback, delay) {
    timersRef.current.push(setTimeout(callback, delay));
  }

  function revealLogo() {
    if (phaseRef.current !== 'video') return;
    phaseRef.current = 'logo';
    if (videoRef.current) videoRef.current.pause();
    setLogoVisible(true);
  }

  function finishIntro() {
    phaseRef.current = 'finished';
    clearIntroTimers();
    onFinish(false);
  }

  function handleVideoProgress(event) {
    if (event.currentTarget.currentTime >= VIDEO_CUTOFF_SECONDS) revealLogo();
  }

  // Missing video or blocked autoplay: show the brand, then release the dashboard.
  // Repeated browser errors must not restart or extend the intro.
  function handleVideoError() {
    if (phaseRef.current !== 'video') return;
    clearIntroTimers();
    revealLogo();
    schedule(function fadeFallback() { setIsLeaving(true); }, 1800);
    schedule(finishIntro, 2500);
  }

  useEffect(function playIntro() {
    const previousOverflow = document.body.style.overflow;
    const video = videoRef.current;
    let cancelled = false;
    phaseRef.current = 'video';
    document.body.style.overflow = 'hidden';

    if (reducedMotion) {
      revealLogo();
      schedule(finishIntro, 1800);
    } else {
      // Wall-clock timers also handle a stalled connection or missing progress events.
      schedule(revealLogo, LOGO_FALLBACK_MS);
      schedule(function fadeIntro() { setIsLeaving(true); }, FADE_START_MS);
      schedule(finishIntro, INTRO_FINISH_MS);
      if (video) {
        try {
          // Explicit play also resumes after React StrictMode's setup/cleanup check.
          const playback = video.play();
          if (playback) playback.catch(function playbackBlocked() {
            if (!cancelled) handleVideoError();
          });
        } catch {
          handleVideoError();
        }
      }
    }

    return function cleanUpIntro() {
      cancelled = true;
      clearIntroTimers();
      if (video) video.pause();
      document.body.style.overflow = previousOverflow;
    };
  }, [onFinish, reducedMotion]);

  let screenClass = 'splash-screen tanaw-video-intro';
  if (logoVisible) screenClass += ' tanaw-video-logo-visible';
  if (isLeaving) screenClass += ' tanaw-video-intro-leaving';

  return (
    <div className={screenClass} role="status" aria-live="polite" aria-label="Starting TANAW">
      <div className="tanaw-intro-backdrop" aria-hidden="true" />
      {!reducedMotion && (
        <video
          ref={videoRef}
          className="tanaw-intro-video"
          src={videoUrl}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onTimeUpdate={handleVideoProgress}
          onEnded={revealLogo}
          onError={handleVideoError}
        />
      )}
      <div className="tanaw-intro-vignette" aria-hidden="true" />
      <div className="splash-logo-lockup">
        <div className="splash-logo-aura" aria-hidden="true" />
        {!logoFailed && (
          <img src={logoUrl} className="splash-logo-image" alt="TANAW fire owl logo"
            fetchPriority="high" onError={() => setLogoFailed(true)} />
        )}
        <div className="splash-brand-rule" aria-hidden="true" />
        <h1>TANAW</h1>
        <p>THERMAL ACTIVITY WATCH</p>
      </div>
    </div>
  );
}
