"use client";

// Animated marker — draws a hand-drawn-looking circle when a number is marked
// Uses SVG with stroke-dashoffset animation for organic feel

import { useId } from "react";

export function NumberMarker({ color = "#FF3D7F", visible }: { color?: string; visible: boolean }) {
  const id = useId();
  if (!visible) return null;

  return (
    <svg className="bb-marker-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* Outer thick circle */}
      <ellipse
        cx="50"
        cy="50"
        rx="38"
        ry="34"
        className="bb-marker-circle"
        stroke={`url(#grad-${id})`}
        strokeWidth="6"
        style={{ color, transform: "rotate(-12deg)", transformOrigin: "center" }}
      />
      {/* Inner slightly offset for hand-drawn feel */}
      <ellipse
        cx="51"
        cy="51"
        rx="35"
        ry="31"
        className="bb-marker-circle"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.6"
        style={{ color, animationDelay: "0.1s", transform: "rotate(8deg)", transformOrigin: "center" }}
      />
    </svg>
  );
}

export function Confetti({ trigger }: { trigger: number }) {
  // Trigger is a number; when it changes, confetti renders. Use key={trigger} to re-render.
  if (!trigger) return null;

  const colors = ["#FF3D7F", "#FFD93D", "#00E5FF", "#B388FF", "#00E676"];
  const pieces = Array.from({ length: 60 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2.5 + Math.random() * 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 8;
    const rotate = Math.random() * 360;
    return (
      <div
        key={`${trigger}-${i}`}
        className="bb-confetti-piece"
        style={{
          left: `${left}%`,
          backgroundColor: color,
          width: `${size}px`,
          height: `${size * 1.5}px`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          transform: `rotate(${rotate}deg)`,
        }}
      />
    );
  });

  return <div key={trigger} className="bb-confetti-container">{pieces}</div>;
}
