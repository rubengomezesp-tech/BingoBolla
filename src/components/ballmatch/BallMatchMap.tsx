"use client";

// ============================================================================
// BingoBolla · Ball Match — Mapa de niveles (selector estilo Candy Crush)
// ----------------------------------------------------------------------------
// Camino serpenteante de nodos con estrellas ganadas y bloqueo progresivo.
// ============================================================================

import { useMemo } from "react";
import { getLevel } from "./levels";
import { MAX_LEVELS, maxUnlocked, totalStars, type Progress } from "./progress";
import "./ballmatch.css";

interface Props {
  progress: Progress;
  onSelect: (level: number) => void;
  onExit: () => void;
}

export default function BallMatchMap({ progress, onSelect, onExit }: Props) {
  const unlocked = maxUnlocked(progress);
  const stars = totalStars(progress);
  const maxStars = MAX_LEVELS * 3;

  // Posición horizontal serpenteante por nivel (zig-zag suave).
  const nodes = useMemo(
    () =>
      Array.from({ length: MAX_LEVELS }, (_, i) => {
        const level = i + 1;
        const phase = Math.sin(i * 0.9);
        const x = 50 + phase * 30; // 20%..80%
        return { level, x, cfg: getLevel(level) };
      }),
    []
  );

  return (
    <div className="bm-root bm-map">
      <div className="bm-mapTop">
        <button className="bm-back" onClick={onExit}>
          ← Mundo
        </button>
        <div className="bm-logo">
          Ball Match
          <small>SELECCIONA NIVEL</small>
        </div>
        <div className="bm-lvlpill">
          ★ {stars}/{maxStars}
        </div>
      </div>

      <div className="bm-mapScroll">
        <div className="bm-mapPath" style={{ height: MAX_LEVELS * 96 + 80 }}>
          {/* línea del camino */}
          <svg className="bm-mapLine" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            <polyline
              points={nodes.map((nd, i) => `${nd.x},${((i + 0.5) / MAX_LEVELS) * 100}`).join(" ")}
              fill="none"
              stroke="rgba(160,110,255,.28)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray="2 2.5"
            />
          </svg>

          {nodes.map((nd, i) => {
            const earned = progress[nd.level] ?? 0;
            const isUnlocked = nd.level <= unlocked;
            const isCurrent = nd.level === unlocked;
            const top = ((i + 0.5) / MAX_LEVELS) * 100;
            return (
              <button
                key={nd.level}
                className={`bm-mapNode${isUnlocked ? "" : " locked"}${isCurrent ? " current" : ""}${
                  earned ? " done" : ""
                }`}
                style={{ left: `${nd.x}%`, top: `${top}%` }}
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelect(nd.level)}
                aria-label={`Nivel ${nd.level}${isUnlocked ? "" : " (bloqueado)"}`}
              >
                <span className="bm-mapNum">{isUnlocked ? nd.level : "🔒"}</span>
                {earned > 0 && (
                  <span className="bm-mapStars">
                    {[1, 2, 3].map((s) => (
                      <i key={s} className={earned >= s ? "on" : ""}>
                        ★
                      </i>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
