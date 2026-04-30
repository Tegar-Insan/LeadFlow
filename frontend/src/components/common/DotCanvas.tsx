// Animated dotted-grid canvas with cursor repulsion and glow.
import React, { useEffect, useRef } from 'react';

type Dot = { ox: number; oy: number; x: number; y: number; phase: number };

const COLS = 40;
const RADIUS = 1.8;
const REPEL = 120;
const STRENGTH = 18;
const WAVE_SPEED = 0.0012;

const DotCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dots: Dot[] = [];
    let mx = -9999;
    let my = -9999;
    let targetMx = -9999;
    let targetMy = -9999;
    let t = 0;
    let animId = 0;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildDots();
    }

    function buildDots() {
      dots = [];
      const colGap = W / COLS;
      const rows = Math.ceil(H / colGap) + 1;
      for (let r = 0; r <= rows; r += 1) {
        for (let c = 0; c <= COLS; c += 1) {
          dots.push({
            ox: c * colGap,
            oy: r * colGap,
            x: c * colGap,
            y: r * colGap,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function draw() {
      mx += (targetMx - mx) * 0.12;
      my += (targetMy - my) * 0.12;
      t += WAVE_SPEED;
      ctx.clearRect(0, 0, W, H);

      const colGap = W / COLS;

      for (const d of dots) {
        const dx = d.ox - mx;
        const dy = d.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let waveOffset = 0;
        if (dist < REPEL * 3) {
          const ripple = Math.sin(dist * 0.06 - t * 60) * 3;
          waveOffset = ripple * Math.max(0, 1 - dist / (REPEL * 3));
        }

        let rx = 0;
        let ry = 0;
        if (dist < REPEL && dist > 0) {
          const force = (1 - dist / REPEL) * STRENGTH;
          rx = (dx / dist) * -force;
          ry = (dy / dist) * -force;
        }

        const drift = Math.sin(t * 30 + d.phase) * 0.5;
        d.x = d.ox + rx + drift;
        d.y = d.oy + ry + waveOffset;

        const proximity = Math.max(0, 1 - dist / REPEL);
        if (proximity > 0.01) {
          const r = Math.round(245 * proximity + 210 * (1 - proximity));
          const g = Math.round(197 * proximity + 210 * (1 - proximity));
          const b = Math.round(24 * proximity + 210 * (1 - proximity));
          const a = 0.18 + proximity * 0.5;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        } else {
          ctx.fillStyle = 'rgba(190,190,190,0.45)';
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      const neighbors = dots.filter((d) => {
        const dx = d.ox - mx;
        const dy = d.oy - my;
        return Math.sqrt(dx * dx + dy * dy) < REPEL * 1.6;
      });

      for (const d of neighbors) {
        const right = dots.find((o) => Math.abs(o.oy - d.oy) < 1 && Math.abs(o.ox - d.ox - colGap) < 1);
        if (right) {
          const d1 = Math.sqrt((d.ox - mx) ** 2 + (d.oy - my) ** 2);
          const d2 = Math.sqrt((right.ox - mx) ** 2 + (right.oy - my) ** 2);
          const prox = Math.max(0, 1 - (d1 + d2) / (2 * REPEL * 1.6));
          ctx.setLineDash([2, colGap - 4]);
          ctx.lineDashOffset = (-t * 600) % colGap;
          ctx.strokeStyle = `rgba(245,197,24,${prox * 0.55})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }

        const below = dots.find((o) => Math.abs(o.ox - d.ox) < 1 && Math.abs(o.oy - d.oy - colGap) < 1);
        if (below) {
          const d1 = Math.sqrt((d.ox - mx) ** 2 + (d.oy - my) ** 2);
          const d2 = Math.sqrt((below.ox - mx) ** 2 + (below.oy - my) ** 2);
          const prox = Math.max(0, 1 - (d1 + d2) / (2 * REPEL * 1.6));
          ctx.setLineDash([2, colGap - 4]);
          ctx.lineDashOffset = (-t * 600) % colGap;
          ctx.strokeStyle = `rgba(245,197,24,${prox * 0.45})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(below.x, below.y);
          ctx.stroke();
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(draw);
    }

    const onMouseMove = (e: MouseEvent) => {
      targetMx = e.clientX;
      targetMy = e.clientY;
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    };

    const onMouseLeave = () => {
      targetMx = -9999;
      targetMy = -9999;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,197,24,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          transition: 'opacity 0.3s',
        }}
      />
    </>
  );
};

export default DotCanvas;
