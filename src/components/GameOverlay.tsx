"use client";
import { useEffect } from "react";

export type GameType = "ballmatch" | "neural_cascade";
interface GameResult { win:boolean; stars:number; xp:number; level:number; }
interface Props { game:GameType|null; nodeId:string|null; level:number; playerId:string; onClose:()=>void; onComplete:(r:GameResult)=>void; }
const PATHS:Record<GameType,string> = { ballmatch:"/games/ballmatch.html", neural_cascade:"/games/neural-cascade.html" };
export default function GameOverlay({game,nodeId,level,playerId,onClose,onComplete}:Props) {
  useEffect(() => {
    if (!game) return;
    async function onMsg(e:MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "BB_GAME_EXIT") { onClose(); return; }
      if (e.data.type === "BB_GAME_RESULT") {
        const r:GameResult = {win:e.data.win??false,stars:e.data.stars??0,xp:e.data.xp??0,level:e.data.level??level};
        let saved = true;
        if (r.win && nodeId) {
          try {
            const res = await fetch("/api/world/complete-node", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                node_id: nodeId,
                stars: r.stars,
                xp: r.xp,
                score: Number(e.data.score ?? 0),
                level: r.level,
                game,
              }),
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok || payload?.error) {
              saved = false;
              console.warn("World progress save failed", payload?.error ?? res.statusText);
            }
          } catch(e){
            saved = false;
            console.error(e);
          }
        }
        if (!saved) {
          window.alert("No se pudo guardar el avance. Revisa conexion e intenta de nuevo.");
          return;
        }
        onComplete(r);
      }
    }
    window.addEventListener("message",onMsg);
    return ()=>window.removeEventListener("message",onMsg);
  },[game,nodeId,playerId,level,onClose,onComplete]);
  if (!game) return null;
  /* TODO Fase 2: reemplazar iframe con router.push(`/play/${game}?level=${level}`) */
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"#06010d"}}>
      <iframe src={`${PATHS[game]}?level=${level}&t=${Date.now()}`}
        style={{width:"100%",height:"100%",border:"none"}} allow="autoplay" title={game}/>
    </div>
  );
}
