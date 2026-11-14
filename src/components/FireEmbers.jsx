// Fire particles follow the owl, then rise behind the final logo.
import React, { useEffect, useRef } from 'react';

export default function FireEmbers({ active }) {
  const canvasRef = useRef(null);

  useEffect(function drawFireTrail() {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width;
    let height;
    let frame;
    const particles = [];
    const startTime = performance.now();
    let lastTime = startTime;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    // These positions follow the flight keyframes in splash-screen.css.
    const flightPoints = [
      [0, 0.98, 0.76],
      [0.18, 0.77, 0.55],
      [0.38, 0.3, 0.33],
      [0.6, 0.58, 0.48],
      [0.8, 0.5, 0.43],
      [1, 0.5, 0.43],
    ];

    function getOwlPosition(progress) {
      for (let index = 1; index < flightPoints.length; index = index + 1) {
        const previous = flightPoints[index - 1];
        const next = flightPoints[index];
        if (progress <= next[0]) {
          const distance = (progress - previous[0]) / (next[0] - previous[0]);
          return {
            x: (previous[1] + (next[1] - previous[1]) * distance) * width,
            y: (previous[2] + (next[2] - previous[2]) * distance) * height,
          };
        }
      }
      return { x: width / 2, y: height * 0.43 };
    }

    function render(time) {
      const elapsed = time - startTime;
      const step = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      const position = getOwlPosition(Math.min(elapsed / 2700, 1));
      if (elapsed < 3900) {
        for (let index = 0; index < 3; index = index + 1) {
          particles.push({
            x: position.x + (Math.random() - 0.5) * 65,
            y: position.y + 32 + Math.random() * 45,
            vx: (Math.random() - 0.5) * 2,
            vy: -0.4 - Math.random() * 1.5,
            life: 1,
            size: 0.7 + Math.random() * 2,
          });
        }
      }

      for (let index = particles.length - 1; index >= 0; index = index - 1) {
        const particle = particles[index];
        particle.x = particle.x + particle.vx * step;
        particle.y = particle.y + particle.vy * step;
        particle.life = particle.life - 0.018 * step;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.fillStyle = 'rgba(255, 119, 30,' + particle.life * 0.65 + ')';
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255, 218, 143,' + particle.life + ')';
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 0.6, 0, Math.PI * 2);
        context.fill();
      }

      frame = requestAnimationFrame(render);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    frame = requestAnimationFrame(render);

    return function stopFireTrail() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="fire-owl-embers" aria-hidden="true" />;
}
