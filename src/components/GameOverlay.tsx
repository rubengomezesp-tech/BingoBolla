"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
export type GameType = "ballmatch" | "neural_cascade";
interface GameResult { win:boolean; stars:number; xp:number; level:number; }
interface Props { game:GameType|null; nodeId:string|null; level:number; playerId:string; onClose:()=>void; onComplete:(r:GameResult)=>void; }
const PATHS:Record<GameType,string> = { ballmatch:"/games/ballmatch.html", neural_cascade:"/games/neural-cascade.html" };
export default function GameOverlay({game,nodeId,level,playerId,onClose,onComplete}:Props) {
  const sb = createClient();
  useEffect(() => {
    if (!game) return;
    async function onMsg(e:MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "BB_GAME_EXIT") { onClose(); return; }
      if (e.data.type === "BB_GAME_RESULT") {
        const r:GameResult = {win:e.data.win??false,stars:e.data.stars??0,xp:e.data.xp??0,level:e.data.level??level};
        if (r.win && nodeId) {
          try {
            await sb.from("world_nodes").update({stars:r.stars,completed:true}).eq("node_id",nodeId);
            if (r.xp>0) await sb.rpc("claim_daily_xp",{p_player_id:playerId,p_xp:r.xp});
            const {data:cur} = await sb.from("world_nodes").select("node_index").eq("node_id",nodeId).single();
            if (cur) await sb.from("world_nodes").update({unlocked:true}).eq("node_index",cur.node_index+1);
          } catch(e){console.error(e);}
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
