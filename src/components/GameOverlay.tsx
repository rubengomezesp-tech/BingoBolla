"use client";
import { useCallback, useEffect } from "react";
import BallMatchGame, { type GameResult as BallMatchResult } from "./ballmatch/BallMatchGame";

export type GameType = "ballmatch" | "neural_cascade";
interface GameResult {
  win: boolean;
  stars: number;
  xp: number;
  level: number;
}
interface Props {
  game: GameType | null;
  nodeId: string | null;
  level: number;
  playerId: string;
  onClose: () => void;
  onComplete: (r: GameResult) => void;
}

// Juegos que aún corren como HTML estático en iframe (sin versión nativa todavía).
const IFRAME_PATHS: Partial<Record<GameType, string>> = {
  neural_cascade: "/games/neural-cascade.html",
};

export default function GameOverlay({ game, nodeId, level, onClose, onComplete }: Props) {
  // Persiste el avance en el mapa del mundo. Devuelve true si se guardó.
  const saveResult = useCallback(
    async (r: GameResult, score: number): Promise<boolean> => {
      if (!r.win || !nodeId) return true;
      try {
        const res = await fetch("/api/world/complete-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node_id: nodeId,
            stars: r.stars,
            xp: r.xp,
            score: Number(score ?? 0),
            level: r.level,
            game,
          }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || payload?.error) {
          console.warn("World progress save failed", payload?.error ?? res.statusText);
          return false;
        }
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    [game, nodeId]
  );

  // Resultado del juego nativo (Ball Match).
  const handleNativeComplete = useCallback(
    async (r: BallMatchResult) => {
      const result: GameResult = { win: r.win, stars: r.stars, xp: r.xp, level: r.level };
      const saved = await saveResult(result, r.score);
      if (!saved) {
        window.alert("No se pudo guardar el avance. Revisa la conexión e inténtalo de nuevo.");
        return;
      }
      onComplete(result);
    },
    [saveResult, onComplete]
  );

  // Puente postMessage para los juegos en iframe (neural_cascade).
  const isIframe = game != null && game in IFRAME_PATHS;
  useEffect(() => {
    if (!isIframe) return;
    async function onMsg(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "BB_GAME_EXIT") {
        onClose();
        return;
      }
      if (e.data.type === "BB_GAME_RESULT") {
        const r: GameResult = {
          win: e.data.win ?? false,
          stars: e.data.stars ?? 0,
          xp: e.data.xp ?? 0,
          level: e.data.level ?? level,
        };
        const saved = await saveResult(r, Number(e.data.score ?? 0));
        if (!saved) {
          window.alert("No se pudo guardar el avance. Revisa la conexión e inténtalo de nuevo.");
          return;
        }
        onComplete(r);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isIframe, level, onClose, onComplete, saveResult]);

  if (!game) return null;

  // Ball Match: juego nativo (React), reemplaza el iframe estático.
  if (game === "ballmatch") {
    return <BallMatchGame level={level} onExit={onClose} onComplete={handleNativeComplete} />;
  }

  // Resto: iframe estático.
  const path = IFRAME_PATHS[game];
  if (!path) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#06010d" }}>
      <iframe
        src={`${path}?level=${level}&t=${Date.now()}`}
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="autoplay"
        title={game}
      />
    </div>
  );
}
