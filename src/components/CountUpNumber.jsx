// NUMBER ANIMATION: duration is in milliseconds. 1000 = one second.
import React, { useEffect, useRef, useState } from 'react';

export default function CountUpNumber({ value, enabled, delay = 0 }) {
  const [displayedNumber, setDisplayedNumber] = useState(0);
  const currentNumber = useRef(0);

  useEffect(function animateNumber() {
    if (!enabled) {
      return;
    }

    const targetNumber = Number(value) || 0;
    const startingNumber = currentNumber.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      currentNumber.current = targetNumber;
      setDisplayedNumber(targetNumber);
      return;
    }

    const duration = 1000;
    const startTime = performance.now() + delay;
    let animationFrame;

    function updateNumber(time) {
      const elapsed = Math.max(0, time - startTime);
      const progress = Math.min(elapsed / duration, 1);
      const smoothProgress = 1 - Math.pow(1 - progress, 3);
      const nextNumber = Math.round(startingNumber + (targetNumber - startingNumber) * smoothProgress);

      currentNumber.current = nextNumber;
      setDisplayedNumber(nextNumber);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateNumber);
      }
    }

    animationFrame = requestAnimationFrame(updateNumber);
    return function stopAnimation() {
      cancelAnimationFrame(animationFrame);
    };
  }, [value, enabled, delay]);

  // Screen readers receive the final value without announcing every animation frame.
  return (
    <span className="animated-number" aria-label={Number(value).toLocaleString()}>
      <span aria-hidden="true">{displayedNumber.toLocaleString()}</span>
    </span>
  );
}
