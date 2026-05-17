"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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

// Imagen única con los 20 anillos ya dibujados
const MAP_IMG = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-map.png";

export default function WorldMap({ playerId }: { playerId: string }) {
  const sb = createClient();
  const router = useRouter();
  const [nodes, setNodes]     = useState<WNode[]>([]);
  const [assets, setAssets]   = useState<Record<string,string>>({});
  const [xp, setXp]           = useState<XPData | null>(null);
  const [prof, setProf]       = useState<{gold_coins:number;sweeps_coins:number}|null>(null);
  const [game, setGame]       = useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [imgH, setImgH]       = useState(0);   // alto real de la imagen renderizada
  const mapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
    }
    load();
  }, [playerId]);

  // Cuando la imagen carga, medir su alto real y hacer scroll al nodo activo
  const onImgLoad = useCallback(() => {
    if (imgRef.current) {
      const h = imgRef.current.offsetHeight;
      setImgH(h);
      setTimeout(() => {
        const active = nodes.find(n => n.unlocked && !n.completed);
        if (active && mapRef.current) {
          mapRef.current.scrollTo({
            top: (active.pos_y/100)*h - window.innerHeight*0.5,
            behavior: "smooth",
          });
        }
      }, 400);
    }
  }, [nodes]);

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

  const mascot = assets["mascot-global"];

  // Rail con acciones reales
  const RAIL = [
    { key:"icon-regalo-diario-v2", fallback:"🎁", lbl:"REGALO",  timer:"⏱ 23h",  badge:"3", bonus:false, action:()=>router.push("/regalo") },
    { key:"icon-gira-gana",        fallback:"🎡", lbl:"RULETA",  timer:"⏱ 8h",   badge:"",  bonus:false, action:()=>router.push("/ruleta") },
    { key:"icon-cofre-vip",        fallback:"💎", lbl:"VIP",     timer:"⏱ 8h",   badge:"",  bonus:false, action:()=>router.push("/tienda") },
    { key:"icon-invitar",          fallback:"👥", lbl:"INVITAR", timer:"💎+100", badge:"5", bonus:true,
      action:()=>{ if(navigator.share){ navigator.share({ title:"BingoBolla", text:"¡Juega conmigo!", url:"https://bingobolla.com" }).catch(()=>{}); } else { navigator.clipboard?.writeText("https://bingobolla.com"); } }
    },
  ];

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

      {/* Rail lateral izquierdo — assets reales + acciones */}
      <div style={{ position:"fixed", left:8, top:"50%", transform:"translateY(-50%)",
        zIndex:40, display:"flex", flexDirection:"column", gap:10 }}>
        {RAIL.map(({ key, fallback, lbl, timer, badge, bonus, action }) => (
          <div key={key} onClick={action}
            style={{ width:64, textAlign:"center", position:"relative", cursor:"pointer" }}>
            <div style={{
              width:58, height:58, margin:"0 auto", borderRadius:16,
              background:"rgba(15,8,40,.9)",
              border:"1.5px solid rgba(200,148,26,.5)",
              backdropFilter:"blur(10px)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 4px 14px rgba(0,0,0,.6)", overflow:"hidden",
            }}>
              {assets[key]
                ? <img src={assets[key]} alt={lbl} style={{ width:"118%", height:"118%", objectFit:"contain" }}/>
                : <span style={{ fontSize:26 }}>{fallback}</span>}
            </div>
            {badge && (
              <div style={{ position:"absolute", top:-2, right:8,
                background:"#ff4d9a", color:"#fff", borderRadius:10,
                fontSize:9, fontWeight:800, padding:"1px 5px",
                border:"1.5px solid #fff", minWidth:16 }}>{badge}</div>
            )}
            <div style={{ marginTop:3, fontSize:9, fontWeight:700, color:"#fff",
              textShadow:"0 1px 4px rgba(0,0,0,.9)" }}>{lbl}</div>
            <div style={{ marginTop:1, fontSize:8, fontWeight:600,
              color: bonus ? "#a8e8ff" : "#ffd98a" }}>{timer}</div>
          </div>
        ))}
      </div>

      {/* Mapa scrollable */}
      <div ref={mapRef} style={{
        height:"100dvh", overflowY:"auto", overflowX:"hidden",
        background:"#06010d", position:"relative",
      }}>
        {/* Contenedor con la imagen real (mantiene proporción) */}
        <div style={{ position:"relative", width:"100%" }}>
          <img
            ref={imgRef}
            src={MAP_IMG}
            alt="Miami Map"
            onLoad={onImgLoad}
            style={{ display:"block", width:"100%", height:"auto" }}
          />

          {/* Nodos — posicionados con % sobre la imagen */}
          {imgH > 0 && nodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            const sz = isBoss ? 56 : 46;

            return (
              <div key={node.node_id} onClick={() => openGame(node)}
                style={{
                  position:"absolute",
                  left:`${node.pos_x}%`,
                  top:`${node.pos_y}%`,
                  transform:"translate(-50%,-50%)",
                  width:sz, height:sz,
                  borderRadius:"50%",
                  background: !node.unlocked
                    ? "rgba(0,0,0,.45)"
                    : node.completed
                      ? "rgba(20,80,40,.4)"
                      : "rgba(120,60,220,.35)",
                  boxShadow: isActive
                    ? `0 0 ${isBoss?26:18}px rgba(255,200,60,.7)`
                    : "none",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:0,
                  cursor: node.unlocked ? "pointer" : "default",
                  animation: isActive ? "nodePulse 1.8s ease-in-out infinite" : "none",
                  zIndex: isBoss ? 5 : 3,
                }}>
                <span style={{ fontSize: isBoss ? 18 : 15 }}>
                  {!node.unlocked ? "🔒" : node.completed ? "✅" : "🎮"}
                </span>
                {node.completed && (
                  <div style={{ display:"flex", gap:1 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:6, opacity:i<node.stars?1:.2 }}>⭐</span>
                    ))}
                  </div>
                )}
                {/* Badge número */}
                <span style={{
                  position:"absolute", top:-7, right:-5,
                  background: isBoss ? "linear-gradient(135deg,#C8941A,#ff8c00)" : "rgba(90,40,200,.95)",
                  borderRadius:9, fontSize:8, fontWeight:800, color:"#fff",
                  padding:"1px 5px", border:"1.5px solid rgba(255,255,255,.3)",
                }}>{node.node_index}</span>
              </div>
            );
          })}

          {/* Mascota sobre nodo activo */}
          {imgH > 0 && (() => {
            const active = nodes.find(n => n.unlocked && !n.completed);
            if (!active) return null;
            return mascot ? (
              <img src={mascot} alt="mascot" style={{
                position:"absolute", left:`${active.pos_x}%`, top:`${active.pos_y}%`,
                transform:"translate(-50%,-165%)",
                width:46, height:46, objectFit:"contain",
                filter:"drop-shadow(0 4px 10px rgba(0,0,0,.8))",
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}/>) : (
              <div style={{
                position:"absolute", left:`${active.pos_x}%`, top:`${active.pos_y}%`,
                transform:"translate(-50%,-165%)", fontSize:32,
                animation:"mascotBob 2s ease-in-out infinite",
                zIndex:8, pointerEvents:"none",
              }}>🟣</div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes nodePulse {
          0%,100%{transform:translate(-50%,-50%) scale(1)}
          50%{transform:translate(-50%,-50%) scale(1.1)}
        }
        @keyframes mascotBob {
          0%,100%{transform:translate(-50%,-165%)}
          50%{transform:translate(-50%,-178%)}
        }
      `}</style>
    </>
  );
}
