"use client";

import { useEffect, useState } from "react";

type WorldInfo = {
  id: string;
  name: string;
  unlock_level: number;
};

type Props = {
  level: number;
  worlds: WorldInfo[];
};

const STORAGE_KEY = "bb:lastSeenLevel";

export default function WorldUnlockedToast({ level, worlds }: Props) {
  const [unlocked, setUnlocked] = useState<WorldInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(level) || level < 1) return;

    let lastSeen = 0;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      lastSeen = raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      lastSeen = 0;
    }

    // Primera visita: solo registramos el nivel actual, sin toast.
    if (lastSeen === 0) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(level));
      } catch {}
      return;
    }

    if (level <= lastSeen) return;

    // Buscamos el mundo más alto cuyo unlock_level fue cruzado en este salto.
    const justUnlocked = worlds
      .filter((w) => w.unlock_level > lastSeen && w.unlock_level <= level && w.id !== "miami_nights")
      .sort((a, b) => b.unlock_level - a.unlock_level)[0];

    // Actualizamos el "last seen" siempre, aunque no haya mundo nuevo.
    try {
      window.localStorage.setItem(STORAGE_KEY, String(level));
    } catch {}

    if (!justUnlocked) return;

    setUnlocked(justUnlocked);
    // Pequeño delay para que la animación de entrada se note tras la hidratación.
    const showTimer = window.setTimeout(() => setVisible(true), 250);
    const hideTimer = window.setTimeout(() => setVisible(false), 7250);
    const clearTimer = window.setTimeout(() => setUnlocked(null), 7700);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [level, worlds]);

  if (!unlocked) return null;

  return (
    <>
      <style>{`
        @keyframes wu-pop-in {
          0% { opacity: 0; transform: translate(-50%, -40px) scale(0.85); }
          70% { opacity: 1; transform: translate(-50%, 6px) scale(1.04); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes wu-pop-out {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -40px) scale(0.9); }
        }
        @keyframes wu-shine {
          0%,100% { box-shadow: 0 0 24px rgba(255, 213, 94, 0.55), 0 18px 36px rgba(0,0,0,0.55); }
          50%     { box-shadow: 0 0 44px rgba(255, 213, 94, 0.95), 0 22px 44px rgba(0,0,0,0.65); }
        }
        .wu-toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translate(-50%, -40px);
          z-index: 9999;
          min-width: 280px;
          max-width: 92vw;
          padding: 14px 22px 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(135deg, #3a0d72 0%, #7b2ff7 55%, #ff87ff 100%);
          border: 2px solid rgba(255, 213, 94, 0.85);
          border-radius: 16px;
          color: #fff;
          font-family: 'Fredoka', system-ui, sans-serif;
          opacity: 0;
          pointer-events: auto;
          cursor: pointer;
          animation: wu-shine 1.8s ease-in-out infinite;
        }
        .wu-toast.in  { animation: wu-pop-in 0.55s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards, wu-shine 1.8s ease-in-out 0.55s infinite; }
        .wu-toast.out { animation: wu-pop-out 0.45s ease-in forwards; }
        .wu-toast .wu-emoji { font-size: 34px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); }
        .wu-toast .wu-text  { display: flex; flex-direction: column; gap: 2px; }
        .wu-toast .wu-kicker{ font-size: 11px; font-weight: 700; letter-spacing: 1.6px; color: #ffd55e; text-transform: uppercase; }
        .wu-toast .wu-title { font-size: 18px; font-weight: 900; line-height: 1.1; }
        .wu-toast .wu-sub   { font-size: 12px; opacity: 0.85; }
        .wu-toast .wu-close {
          margin-left: auto;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(0,0,0,0.35);
          color: #fff;
          border: none;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          display: grid; place-items: center;
        }
        .wu-toast .wu-close:hover { background: rgba(0,0,0,0.6); }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        data-testid="world-unlocked-toast"
        className={`wu-toast ${visible ? "in" : "out"}`}
        onClick={() => setVisible(false)}
      >
        <span className="wu-emoji" aria-hidden>🎉</span>
        <div className="wu-text">
          <span className="wu-kicker">¡Nuevo mundo desbloqueado!</span>
          <span className="wu-title" data-testid="world-unlocked-name">{unlocked.name}</span>
          <span className="wu-sub">Has llegado al nivel {unlocked.unlock_level}. ¡A jugar!</span>
        </div>
        <button
          type="button"
          className="wu-close"
          aria-label="Cerrar notificación"
          data-testid="world-unlocked-close"
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
          }}
        >
          ×
        </button>
      </div>
    </>
  );
}
