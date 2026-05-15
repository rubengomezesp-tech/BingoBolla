"use client";

import { useEffect, useState } from "react";

type Bubble = {
  size: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
};

/**
 * Burbujas flotantes decorativas.
 * IMPORTANTE: el random se genera SOLO en cliente (useEffect) para evitar
 * hydration mismatch (React error #418). En SSR no renderiza nada.
 */
export function FloatingBubbles({ count = 12 }: { count?: number }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const colors = [
      "rgba(255,61,127,0.08)",
      "rgba(0,229,255,0.08)",
      "rgba(255,217,61,0.08)",
      "rgba(179,136,255,0.08)",
    ];
    const generated: Bubble[] = Array.from({ length: count }, (_, i) => ({
      size: 20 + Math.random() * 80,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 18 + Math.random() * 12,
      drift: (Math.random() - 0.5) * 200,
      color: colors[i % colors.length],
    }));
    setBubbles(generated);
  }, [count]);

  // SSR + primer paint: nada (evita mismatch)
  if (bubbles.length === 0) return <div className="bubble-field" />;

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
 * Fondo aurora con blobs animados. Estático (CSS puro), seguro en SSR.
 */
export function AuroraBackground() {
  return (
    <>
      <div className="aurora-bg" />
      <div className="aurora-bg-2" />
    </>
  );
}
