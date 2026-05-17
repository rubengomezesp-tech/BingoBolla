"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import GameOverlay, { GameType } from "@/components/GameOverlay";

type WNode = {
  node_id: string; node_index: number; node_type: string;
  title: string; pos_x: number; pos_y: number;
  target_ref: string | null; max_stars: number;
  completed: boolean; stars: number; unlocked: boolean;
};
type XPData = { level: number; xp_into_level: number; xp_needed_level: number; progress_pct: number; };

const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n);
const BOSS = new Set([5,10,15,20]);

// URLs directas de Supabase Storage
const IMG_TOP = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-top.png";
const IMG_BOT = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-bottom.png";

export default function WorldMap({ playerId }: { playerId: string }) {
  const sb = createClient();
  const [nodes, setNodes]     = useState<WNode[]>([]);
  const [assets, setAssets]   = useState<Record<string,string>>({});
  const [xp, setXp]           = useState<XPData | null>(null);
  const [prof, setProf]       = useState<{gold_coins:number;sweeps_coins:number}|null>(null);
  const [game, setGame]       = useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [nr, ar, xr, pr] = await Promise.all([
        sb.from("world_nodes").select("*").order("node_index"),
        sb.rpc("get_world_assets"),
        sb.rpc("get_player_xp", { p_player_id: playerId }),
        sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single(),
      ]);
      if (nr.data) setNodes(nr.data);
      if (ar.data) { const m: Record<string,string> = {}; for (const a of ar.data) m[a.asset_key] = a.url; setAssets(m); }
      if (xr.data?.[0]) setXp(xr.data[0]);
      if (pr.data) setProf(pr.data);
      setLoading(false);
      setTimeout(() => {
        const active = nr.data?.find((n: WNode) => n.unlocked && !n.completed);
        if (active && mapRef.current) {
          const h = mapRef.current.scrollHeight;
          mapRef.current.scrollTo({ top: (active.pos_y/100)*h - window.innerHeight*0.55, behavior:"smooth" });
        }
      }, 800);
    }
    load();
  }, [playerId]);

  const openGame = useCallback((n: WNode) => {
    if (!n.unlocked) return;
    const g = n.target_ref as GameType;
    if (g !== "ballmatch" && g !== "neural_cascade") return;
    setGame({ game:g, nodeId:n.node_id, level:n.node_index });
  }, []);

  const handleDone = useCallback(async (r: {win:boolean;stars:number;xp:number}) => {
    if (r.win) {
      const [nr, xr, pr] = await Promise.all([
        sb.from("world_nodes").select("*").order("node_index"),
        sb.rpc("get_player_xp", { p_player_id: playerId }),
        sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single(),
      ]);
      if (nr.data) setNodes(nr.data);
      if (xr.data?.[0]) setXp(xr.data[0]);
      if (pr.data) setProf(pr.data);
    }
    setGame(null);
  }, [playerId]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#06010d", color:"rgba(200,200,255,.5)" }}>
      Cargando Miami...
    </div>
  );

  const mapH = nodes.length * 140;
  const mascot = assets["mascot-global"];

  return (
    <>
      <GameOverlay
        game={game?.game ?? null} nodeId={game?.nodeId ?? null}
        level={game?.level ?? 1} playerId={playerId}
        onClose={() => setGame(null)} onComplete={handleDone}
      />

      {/* HUD fijo */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50,
        background:"linear-gradient(180deg,rgba(6,1,13,.95),transparent)",
        padding:"env(safe-area-inset-top,10px) 14px 10px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative", width:42, height:42 }}>
            <svg width="42" height="42" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(120,80,220,.3)" strokeWidth="3"/>
              <circle cx="21" cy="21" r="17" fill="none" stroke="#C8941A" strokeWidth="3"
                strokeDasharray={`${2*Math.PI*17}`}
                strokeDashoffset={`${2*Math.PI*17*(1-(xp?.progress_pct??0)/100)}`}
                strokeLinecap="round"/>
            </svg>
            <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:11, fontWeight:700, color:"#C8941A" }}>
              {xp?.level??1}
            </span>
          </div>
          <div style={{ fontSize:11, color:"rgba(200,200,255,.7)" }}>
            <div style={{ fontWeight:700, color:"#C8941A", fontSize:12 }}>NV {xp?.level??1}</div>
            <div style={{ fontSize:9 }}>{fmt(xp?.xp_into_level??0)}/{fmt(xp?.xp_needed_level??100)} XP</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[{icon:"🪙",v:prof?.gold_coins??0},{icon:"💎",v:prof?.sweeps_coins??0}].map(({icon,v},i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:4,
              background:"rgba(255,255,255,.07)", borderRadius:20, padding:"4px 10px",
              border:"1px solid rgba(255,255,255,.1)" }}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <span style={{ fontSize:12, fontWeight:700 }}>{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa scrollable */}
      <div ref={mapRef} style={{
        height:"100dvh", overflowY:"auto", overflowX:"hidden",
        position:"relative", background:"#06010d",
      }}>
        {/* Fondo: IMG_TOP arriba (nodos 11-20) + IMG_BOT abajo (nodos 1-10) */}
        <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
          {/* South Beach — mitad superior */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:"50%",
            backgroundImage:`url(${IMG_TOP})`,
            backgroundSize:"cover", backgroundPosition:"center top",
          }}/>
          {/* Miami Beach — mitad inferior */}
          <div style={{
            position:"absolute", top:"50%", left:0, right:0, height:"50%",
            backgroundImage:`url(${IMG_BOT})`,
            backgroundSize:"cover", backgroundPosition:"center bottom",
          }}/>
          {/* Fade suave en la unión */}
          <div style={{
            position:"absolute", top:"46%", left:0, right:0, height:"8%",
            background:"linear-gradient(180deg,transparent,rgba(6,1,13,.5),transparent)",
          }}/>
          {/* Oscurecer ligeramente para que los nodos destaquen */}
          <div style={{ position:"absolute", inset:0, background:"rgba(6,1,13,.3)" }}/>
        </div>

        {/* Contenido del mapa */}
        <div style={{ position:"relative", zIndex:2, height:`${mapH}px` }}>

          {/* Conexiones entre nodos */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <defs>
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {nodes.map((n,i) => {
              if (!i) return null;
              const p = nodes[i-1];
              return (
                <line key={n.node_id}
                  x1={`${p.pos_x}%`} y1={`${(p.pos_y/100)*mapH}px`}
                  x2={`${n.pos_x}%`} y2={`${(n.pos_y/100)*mapH}px`}
                  stroke={n.unlocked ? "#C8941A" : "rgba(100,60,180,.35)"}
                  strokeWidth={n.unlocked ? "3.5" : "2"}
                  strokeDasharray={n.unlocked ? "none" : "8,5"}
                  filter={n.unlocked ? "url(#lineGlow)" : "none"}
                  opacity={n.unlocked ? 0.85 : 0.4}
                />
              );
            })}
          </svg>

          {/* Nodos */}
          {nodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            const sz       = isBoss ? 80 : 66;

            return (
              <div key={node.node_id} onClick={() => openGame(node)}
                style={{
                  position:"absolute",
                  left:`${node.pos_x}%`,
                  top:`${(node.pos_y/100)*mapH}px`,
                  transform:"translate(-50%,-50%)",
                  width:sz, height:sz,
                  borderRadius: isBoss ? 20 : "50%",
                  background: !node.unlocked
                    ? "rgba(8,4,20,.88)"
                    : isBoss
                      ? "radial-gradient(circle at 35% 30%,rgba(255,190,50,.35),rgba(200,80,160,.25))"
                      : node.completed
                        ? "radial-gradient(circle at 35% 30%,rgba(40,200,90,.3),rgba(20,130,50,.2))"
                        : "radial-gradient(circle at 35% 30%,rgba(150,80,255,.35),rgba(80,30,190,.25))",
                  border: !node.unlocked
                    ? "2px solid rgba(80,50,160,.35)"
                    : isBoss
                      ? "3px solid #C8941A"
                      : node.completed
                        ? "2.5px solid rgba(60,220,120,.85)"
                        : "2.5px solid rgba(160,90,255,.9)",
                  boxShadow: isActive
                    ? `0 0 ${isBoss?32:22}px ${isBoss?"rgba(200,148,26,.75)":"rgba(150,90,255,.75)"}, 0 0 ${isBoss?64:44}px ${isBoss?"rgba(200,148,26,.3)":"rgba(150,90,255,.3)"}`
                    : node.completed ? "0 0 14px rgba(60,220,120,.4)" : "0 4px 18px rgba(0,0,0,.65)",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:2,
                  cursor: node.unlocked ? "pointer" : "default",
                  backdropFilter:"blur(12px)",
                  animation: isActive ? "nodePulse 2s ease-in-out infinite" : "none",
                  zIndex: isBoss ? 5 : 3,
                }}>
                <span style={{ fontSize: isBoss ? 26 : 20 }}>
                  {isBoss ? "⭐" : !node.unlocked ? "🔒" : node.completed ? "✅" : "🎮"}
                </span>
                <span style={{
                  fontSize: isBoss ? 9 : 8, fontWeight:700, textAlign:"center",
                  color: isBoss ? "#ffd23d" : "rgba(235,225,255,.95)",
                  maxWidth:sz-10, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
                  textShadow:"0 1px 4px rgba(0,0,0,.9)",
                }}>{node.title}</span>
                {node.completed && (
                  <div style={{ display:"flex", gap:2 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:8, opacity:i<node.stars?1:.2 }}>⭐</span>
                    ))}
                  </div>
                )}
                <span style={{
                  position:"absolute", top:-8, right:-5,
                  background: isBoss ? "linear-gradient(135deg,#C8941A,#ff8c00)" : "rgba(100,50,220,.95)",
                  borderRadius:10, fontSize:9, fontWeight:800, color:"#fff",
                  padding:"1px 6px", border:"1.5px solid rgba(255,255,255,.3)",
                  boxShadow: isBoss ? "0 0 10px rgba(200,148,26,.6)" : "0 2px 6px rgba(0,0,0,.5)",
                }}>{node.node_index}</span>
              </div>
            );
          })}

          {/* Mascota sobre nodo activo */}
          {(() => {
            const active = nodes.find(n => n.unlocked && !n.completed);
            if (!active) return null;
            return mascot ? (
              <img src={mascot} alt="mascot" style={{
                position:"absolute",
                left:`${active.pos_x}%`,
                top:`${(active.pos_y/100)*mapH}px`,
                transform:"translate(-50%,-162%)",
                width:54, height:54, objectFit:"contain",
                filter:"drop-shadow(0 4px 12px rgba(0,0,0,.75))",
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}/>) : (
              <div style={{
                position:"absolute",
                left:`${active.pos_x}%`,
                top:`${(active.pos_y/100)*mapH}px`,
                transform:"translate(-50%,-162%)",
                fontSize:40,
                filter:"drop-shadow(0 4px 12px rgba(0,0,0,.75))",
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}>🟣</div>
            );
          })()}
        </div>
        <div style={{ height:"15vh" }}/>
      </div>

      <style>{`
        @keyframes nodePulse {
          0%,100%{transform:translate(-50%,-50%) scale(1)}
          50%{transform:translate(-50%,-50%) scale(1.08)}
        }
        @keyframes mascotBob {
          0%,100%{transform:translate(-50%,-162%)}
          50%{transform:translate(-50%,-178%)}
        }
      `}</style>
    </>
  );
}
