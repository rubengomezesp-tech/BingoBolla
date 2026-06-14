"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BallMatchGame, { type GameResult } from "./ballmatch/BallMatchGame";
import BallMatchMap from "./ballmatch/BallMatchMap";
import { loadProgress, saveStars, type Progress } from "./ballmatch/progress";

export default function BallMatchClient({
  level,
  nodeId,
}: {
  level?: number | null;
  nodeId?: string | null;
}) {
  const router = useRouter();
  // Si llega un nivel por la URL (p.ej. enlace directo o nodo del mundo) vamos
  // directos al juego; si no, mostramos el mapa de niveles.
  const fromUrl = useRef<boolean>(level != null);
  const [selected, setSelected] = useState<number | null>(level ?? null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);

  const backToMundo = useCallback(() => router.push("/mundo"), [router]);

  // Salir del juego: si vino por URL -> al mundo; si vino del mapa -> al mapa.
  const exitGame = useCallback(() => {
    if (fromUrl.current) {
      backToMundo();
    } else {
      setProgress(loadProgress());
      setSelected(null);
    }
  }, [backToMundo]);

  const complete = useCallback(
    async (r: GameResult) => {
      // Guarda siempre el progreso local del nivel.
      if (r.win && r.level) setProgress(saveStars(r.level, r.stars));

      // Flujo del mundo (enlace con node): persiste en Supabase y vuelve al mundo.
      if (r.win && nodeId && !savedRef.current) {
        savedRef.current = true;
        setSaving(true);
        try {
          const res = await fetch("/api/world/complete-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ node_id: nodeId, stars: r.stars, score: r.score, level: r.level }),
          });
          const payload = await res.json().catch(() => null);
          if (!res.ok || payload?.error) {
            savedRef.current = false;
            setSaving(false);
            window.alert("No se pudo guardar el avance. Revisa la conexión e inténtalo de nuevo.");
            return;
          }
        } catch {
          savedRef.current = false;
          setSaving(false);
          window.alert("No se pudo guardar el avance. Revisa la conexión e inténtalo de nuevo.");
          return;
        }
        backToMundo();
        return;
      }

      // Flujo del mapa: vuelve al mapa (con el siguiente nivel ya desbloqueado).
      if (fromUrl.current) backToMundo();
      else setSelected(null);
    },
    [nodeId, backToMundo]
  );

  if (selected == null) {
    return <BallMatchMap progress={progress} onSelect={(lvl) => setSelected(lvl)} onExit={backToMundo} />;
  }

  return (
    <>
      <BallMatchGame key={selected} level={selected} onExit={exitGame} onComplete={complete} />
      {saving && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(6,1,13,.6)",
            color: "#ffd98a",
            fontFamily: "'Fredoka',system-ui",
            fontWeight: 700,
          }}
        >
          Guardando avance…
        </div>
      )}
    </>
  );
}
