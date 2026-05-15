"use client";

import { useMemo } from "react";

/**
 * Burbujas flotantes decorativas que ascienden de fondo.
 * Se renderizan una vez, sin re-renders.
 */
export function FloatingBubbles({ count = 12 }: { count?: number }) {
  const bubbles = useMemo(() => {
    const colors = [
      "rgba(255,61,127,0.08)",
      "rgba(0,229,255,0.08)",
      "rgba(255,217,61,0.08)",
      "rgba(179,136,255,0.08)",
    ];
    return Array.from({ length: count }, (_, i) => {
      const size = 20 + Math.random() * 80;
      const left = Math.random() * 100;
      const delay = Math.random() * 20;
      const duration = 18 + Math.random() * 12;
      const drift = (Math.random() - 0.5) * 200;
      const color = colors[i % colors.length];
      return { size, left, delay, duration, drift, color };
    });
  }, [count]);

  return (
    <div className="bubble-field">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="bubble"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            background: `radial-gradient(circle at 30% 30%, ${b.color}, transparent 70%)`,
            ["--drift" as any]: `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Fondo aurora con tres blobs animados.
 * Se renderiza una vez. Coloca en el layout root o por página.
 */
export function AuroraBackground() {
  return (
    <>
      <div className="aurora-bg" />
      <div className="aurora-bg-2" />
    </>
  );
}
