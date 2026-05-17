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
const MAP_IMG = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-map.png";

// Email admin — solo este usuario ve el editor drag-and-drop
const ADMIN_EMAIL = "rubengomezesp@gmail.com";

export default function WorldMap({ playerId }: { playerId: string }) {
  const sb = createClient();
  const router = useRouter();
  const [nodes, setNodes]     = useState<WNode[]>([]);
  const [assets, setAssets]   = useState<Record<string,string>>({});
  const [xp, setXp]           = useState<XPData | null>(null);
  const [prof, setProf]       = useState<{gold_coins:number;sweeps_coins:number}|null>(null);
  const [game, setGame]       = useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId]   = useState<string|null>(null);
  const [dirty, setDirty]     = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const safe = async (p: any) => { try { return await Promise.resolve(p); } catch { return { data: null }; } };
      const [nr, ar, xr, pr, ur] = await Promise.all([
        safe(sb.from("world_nodes").select("*").order("node_index")),
        safe(sb.rpc("get_world_assets")),
        safe(sb.rpc("get_player_xp", { p_player_id: playerId })),
        safe(sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single()),
        safe(sb.auth.getUser()),
      ]);
      if (Array.isArray(nr?.data) && nr.data.length) setNodes(nr.data);
      if (Array.isArray(ar?.data)) {
        const m: Record<string,string> = {};
        for (const a of ar.data) m[a.asset_key] = a.url;
        setAssets(m);
      }
      if (Array.isArray(xr?.data) && xr.data[0]) setXp(xr.data[0]);
      if (pr?.data) setProf(pr.data);
      // Detectar admin
      const email = ur?.data?.user?.email;
      if (email === ADMIN_EMAIL) setIsAdmin(true);
      setLoading(false);
    }
    load();
  }, [playerId]);

  const openGame = useCallback((n: WNode) => {
    if (editMode) return; // en modo editor no se abren juegos
    if (!n.unlocked) return;
    const g = n.target_ref as GameType;
    if (g !== "ballmatch" && g !== "neural_cascade") return;
    setGame({ game:g, nodeId:n.node_id, level:n.node_index });
  }, [editMode]);

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

  // === DRAG & DROP (modo editor admin) ===
  const onPointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(nodeId);
  };

  const onPointerMove = (e: React.PointerEvent, nodeId?: string) => {
    if (!editMode || !dragId || !imgWrapRef.current) return;
    if (nodeId && nodeId !== dragId) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNodes(prev => prev.map(n =>
      n.node_id === dragId
        ? { ...n, pos_x: Math.max(0, Math.min(100, +x.toFixed(2))), pos_y: Math.max(0, Math.min(100, +y.toFixed(2))) }
        : n
    ));
    setDirty(true);
  };

  const onPointerUp = () => setDragId(null);

  const saveCoords = async () => {
    for (const n of nodes) {
      await sb.from("world_nodes")
        .update({ pos_x: n.pos_x, pos_y: n.pos_y })
        .eq("node_id", n.node_id);
    }
    setDirty(false);
    alert("✅ Coordenadas guardadas en la BD");
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#06010d", color:"rgba(200,200,255,.5)" }}>
      Cargando Miami...
    </div>
  );

  const mascot = assets["mascot-global"];
  const lockImg = assets["node-locked"];

  const RAIL = [
    { key:"icon-regalo-diario", fallback:"🎁", lbl:"REGALO",  timer:"⏱ 23h",  badge:"3", bonus:false, action:()=>router.push("/regalo") },
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

      {/* Botón modo editor — SOLO admin */}
      {isAdmin && (
        <div style={{ position:"fixed", top:"calc(env(safe-area-inset-top,10px) + 56px)",
          right:14, zIndex:60, display:"flex", gap:6 }}>
          <button onClick={() => setEditMode(!editMode)}
            style={{ padding:"6px 12px", borderRadius:10,
              background: editMode ? "#ff4d9a" : "rgba(120,80,220,.9)",
              color:"#fff", border:"1.5px solid rgba(255,255,255,.3)",
              fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {editMode ? "✏️ EDITANDO" : "🔧 Editar nodos"}
          </button>
          {editMode && dirty && (
            <button onClick={saveCoords}
              style={{ padding:"6px 12px", borderRadius:10,
                background:"#3ddc78", color:"#003318",
                border:"1.5px solid rgba(255,255,255,.3)",
                fontSize:11, fontWeight:800, cursor:"pointer" }}>
              💾 Guardar
            </button>
          )}
        </div>
      )}

      {/* Aviso modo editor */}
      {editMode && (
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
          zIndex:60, background:"rgba(255,77,154,.95)", color:"#fff",
          padding:"8px 16px", borderRadius:20, fontSize:12, fontWeight:700,
          boxShadow:"0 4px 16px rgba(0,0,0,.5)" }}>
          Arrastra cada nodo sobre su anillo → pulsa Guardar
        </div>
      )}

      {/* Rail lateral izquierdo */}
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
        height:"100dvh", overflowY: editMode ? "hidden" : "auto", overflowX:"hidden",
        background:"#06010d", position:"relative",
        touchAction: editMode ? "none" : "auto",
      }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div ref={imgWrapRef} style={{ position:"relative", width:"100%" }}>
          <img src={MAP_IMG} alt="Miami Map" draggable={false}
            style={{ display:"block", width:"100%", height:"auto" }}/>

          {/* Nodos */}
          {nodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            const sz = isBoss ? 54 : 44;
            const isDragging = dragId === node.node_id;

            return (
              <div key={node.node_id}
                onPointerDown={(e) => onPointerDown(e, node.node_id)}
                onPointerMove={(e) => onPointerMove(e, node.node_id)}
                onPointerUp={onPointerUp}
                onClick={() => openGame(node)}
                style={{
                  position:"absolute",
                  left:`${node.pos_x}%`,
                  top:`${node.pos_y}%`,
                  transform:"translate(-50%,-50%)",
                  width:sz, height:sz,
                  borderRadius:"50%",
                  background: editMode
                    ? "rgba(255,77,154,.5)"
                    : !node.unlocked
                      ? "rgba(0,0,0,.4)"
                      : node.completed
                        ? "rgba(20,80,40,.35)"
                        : "rgba(120,60,220,.3)",
                  border: editMode ? "2px dashed #fff" : "none",
                  boxShadow: isDragging
                    ? "0 0 20px #fff"
                    : isActive
                      ? `0 0 ${isBoss?24:16}px rgba(255,200,60,.7)`
                      : "none",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  cursor: editMode ? "grab" : node.unlocked ? "pointer" : "default",
                  animation: (isActive && !editMode) ? "nodePulse 1.8s ease-in-out infinite" : "none",
                  zIndex: isDragging ? 20 : isBoss ? 5 : 3,
                  touchAction:"none",
                }}>
                {/* Icono según estado */}
                {!node.unlocked ? (
                  lockImg
                    ? <img src={lockImg} alt="locked" style={{ width:sz*0.55, height:sz*0.55, objectFit:"contain" }}/>
                    : <span style={{ fontSize: isBoss ? 18 : 15 }}>🔒</span>
                ) : node.completed ? (
                  <span style={{ fontSize: isBoss ? 18 : 15 }}>✅</span>
                ) : (
                  <span style={{ fontSize: isBoss ? 18 : 15 }}>🎮</span>
                )}
                {node.completed && !editMode && (
                  <div style={{ display:"flex", gap:1 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:6, opacity:i<node.stars?1:.2 }}>⭐</span>
                    ))}
                  </div>
                )}
                <span style={{
                  position:"absolute", top:-7, right:-5,
                  background: editMode ? "#ff4d9a" : isBoss ? "linear-gradient(135deg,#C8941A,#ff8c00)" : "rgba(90,40,200,.95)",
                  borderRadius:9, fontSize:8, fontWeight:800, color:"#fff",
                  padding:"1px 5px", border:"1.5px solid rgba(255,255,255,.3)",
                }}>{node.node_index}</span>
              </div>
            );
          })}

          {/* Mascota */}
          {!editMode && (() => {
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
              }}/>) : null;
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
