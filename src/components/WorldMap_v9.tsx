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

// Imagen única con todos los anillos ya dibujados
const MAP_IMG = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-map.png";

// Assets laterales del rail
const RAIL_ASSETS = [
  { key:"icon-regalo-diario-v2", fallback:"🎁", label:"Regalo" },
  { key:"icon-gira-gana",        fallback:"🎡", label:"Ruleta" },
  { key:"icon-cofre-vip",        fallback:"💎", label:"VIP"    },
  { key:"icon-invitar",          fallback:"👥", label:"Invite" },
];

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
      const safe = async (p: any) => { try { return await Promise.resolve(p); } catch { return { data: null }; } };
      const [nr, ar, xr, pr] = await Promise.all([
        safe(sb.from("world_nodes").select("*").order("node_index")),
        safe(sb.rpc("get_world_assets")),
        safe(sb.rpc("get_player_xp", { p_player_id: playerId })),
        safe(sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single()),
      ]);
      if (Array.isArray(nr?.data) && nr.data.length) setNodes(nr.data);
      if (Array.isArray(ar?.data)) {
        const m: Record<string,string> = {};
        for (const a of ar.data) m[a.asset_key] = a.url;
        setAssets(m);
      }
      if (Array.isArray(xr?.data) && xr.data[0]) setXp(xr.data[0]);
      if (pr?.data) setProf(pr.data);
      setLoading(false);
      setTimeout(() => {
        const active = nr?.data?.find((n: WNode) => n.unlocked && !n.completed);
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
      const safe = async (p: any) => { try { return await Promise.resolve(p); } catch { return { data: null }; } };
      const [nr, xr, pr] = await Promise.all([
        safe(sb.from("world_nodes").select("*").order("node_index")),
        safe(sb.rpc("get_player_xp", { p_player_id: playerId })),
        safe(sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single()),
      ]);
      if (Array.isArray(nr?.data) && nr.data.length) setNodes(nr.data);
      if (Array.isArray(xr?.data) && xr.data[0]) setXp(xr.data[0]);
      if (pr?.data) setProf(pr.data);
    }
    setGame(null);
  }, [playerId]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#06010d", color:"rgba(200,200,255,.5)" }}>
      Cargando Miami...
    </div>
  );

  // La altura del mapa = ancho de pantalla × ratio de la imagen (portrait ~2.2:1)
  // Usamos window.innerWidth × 2.2 para mantener proporciones perfectas
  const mapH = typeof window !== "undefined" ? Math.round(window.innerWidth * 2.22) : 2400;
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
        background:"linear-gradient(180deg,rgba(6,1,13,.92),transparent)",
        padding:"env(safe-area-inset-top,10px) 14px 12px",
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

      {/* Rail lateral derecho — assets reales de Supabase */}
      <div style={{ position:"fixed", right:8, top:"50%", transform:"translateY(-50%)",
        zIndex:40, display:"flex", flexDirection:"column", gap:8 }}>
        {RAIL_ASSETS.map(({ key, fallback, label }) => (
          <div key={key} style={{
            width:50, height:50, borderRadius:14,
            background:"rgba(15,8,40,.88)",
            border:"1.5px solid rgba(200,148,26,.45)",
            backdropFilter:"blur(10px)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:1,
            cursor:"pointer",
            boxShadow:"0 4px 14px rgba(0,0,0,.55)",
          }}>
            {assets[key]
              ? <img src={assets[key]} alt={label} style={{ width:30, height:30, objectFit:"contain" }}/>
              : <span style={{ fontSize:22 }}>{fallback}</span>
            }
            <span style={{ fontSize:7, color:"rgba(210,190,255,.65)", fontWeight:700 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Mapa scrollable */}
      <div ref={mapRef} style={{
        height:"100dvh", overflowY:"auto", overflowX:"hidden",
        position:"relative", background:"#06010d",
      }}>
        {/* IMAGEN ÚNICA — cubre todo el alto del mapa */}
        <div style={{
          position:"absolute", top:0, left:0, right:0,
          height:`${mapH}px`,
          backgroundImage:`url(${MAP_IMG})`,
          backgroundSize:"100% 100%",
          backgroundRepeat:"no-repeat",
          backgroundPosition:"top center",
          zIndex:0,
        }}/>

        {/* Contenido del mapa */}
        <div style={{ position:"relative", zIndex:2, height:`${mapH}px` }}>

          {/* Nodos — encima de los anillos de la imagen */}
          {nodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            // Tamaño del nodo = ~8% del ancho (encaja dentro del anillo de la imagen)
            const sz = isBoss ? 70 : 58;

            return (
              <div key={node.node_id} onClick={() => openGame(node)}
                style={{
                  position:"absolute",
                  left:`${node.pos_x}%`,
                  top:`${(node.pos_y/100)*mapH}px`,
                  transform:"translate(-50%,-50%)",
                  width:sz, height:sz,
                  borderRadius:"50%",
                  // Fondo semitransparente — deja ver el anillo de la imagen debajo
                  background: !node.unlocked
                    ? "rgba(0,0,0,.55)"
                    : node.completed
                      ? "rgba(20,80,40,.6)"
                      : "rgba(80,20,160,.45)",
                  border: isActive
                    ? "none"  // sin borde — el anillo de la imagen ya es el borde
                    : "none",
                  boxShadow: isActive
                    ? `0 0 ${isBoss?28:18}px rgba(200,148,26,.65)`
                    : "none",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:1,
                  cursor: node.unlocked ? "pointer" : "default",
                  animation: isActive ? "nodePulse 2s ease-in-out infinite" : "none",
                  zIndex: isBoss ? 5 : 3,
                }}>
                <span style={{ fontSize: isBoss ? 22 : 18 }}>
                  {!node.unlocked ? "🔒" : node.completed ? "✅" : "🎮"}
                </span>
                <span style={{
                  fontSize: 8, fontWeight:700, textAlign:"center",
                  color: "rgba(255,255,255,.95)",
                  maxWidth: sz-8, overflow:"hidden",
                  whiteSpace:"nowrap", textOverflow:"ellipsis",
                  textShadow:"0 1px 4px rgba(0,0,0,1)",
                }}>{node.title}</span>
                {node.completed && (
                  <div style={{ display:"flex", gap:1 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:7, opacity:i<node.stars?1:.2 }}>⭐</span>
                    ))}
                  </div>
                )}
                {/* Número de nivel */}
                <span style={{
                  position:"absolute", top:-9, right:-6,
                  background: isBoss ? "linear-gradient(135deg,#C8941A,#ff8c00)" : "rgba(90,40,200,.95)",
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
            const top = (active.pos_y/100)*mapH;
            return mascot ? (
              <img src={mascot} alt="mascot" style={{
                position:"absolute", left:`${active.pos_x}%`, top:`${top}px`,
                transform:"translate(-50%,-160%)",
                width:52, height:52, objectFit:"contain",
                filter:"drop-shadow(0 4px 12px rgba(0,0,0,.8))",
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}/>) : (
              <div style={{
                position:"absolute", left:`${active.pos_x}%`, top:`${top}px`,
                transform:"translate(-50%,-160%)", fontSize:38,
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}>🟣</div>
            );
          })()}
        </div>
        <div style={{ height:"10vh" }}/>
      </div>

      <style>{`
        @keyframes nodePulse {
          0%,100%{transform:translate(-50%,-50%) scale(1)}
          50%{transform:translate(-50%,-50%) scale(1.1)}
        }
        @keyframes mascotBob {
          0%,100%{transform:translate(-50%,-160%)}
          50%{transform:translate(-50%,-175%)}
        }
      `}</style>
    </>
  );
}
