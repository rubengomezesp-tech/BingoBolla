"use client";
/**
 * WorldMap v9 — 20 nodos scrollable
 * Fondo CSS generativo Miami Nights (sin imagen, infinitamente scrollable)
 * Integra GameOverlay híbrido (iframe → React Fase 2)
 */
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

/* ── Fondo CSS Miami Nights generativo ── */
const MiamiBg = ({ scrollY, mapH }: { scrollY: number; mapH: number }) => {
  const prog = scrollY / mapH; // 0 = abajo (inicio), 1 = arriba (final)

  // Colores del cielo cambian según la altura del mapa
  // Abajo (nodo 1): noche profunda con luces de ciudad
  // Centro (nodo 10): atardecer neón
  // Arriba (nodo 20): amanecer dorado épico
  const skyBot = `hsl(${260 + prog*40}, 80%, ${4 + prog*8}%)`;
  const skyTop = `hsl(${280 + prog*60}, 70%, ${8 + prog*14}%)`;

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBot} 100%)`,
    }}>
      {/* ── Estrellas (más visibles abajo, desaparecen arriba) ── */}
      {Array.from({length: 60}).map((_, i) => (
        <div key={`star-${i}`} style={{
          position:"absolute",
          left: `${(i * 17 + 3) % 100}%`,
          top:  `${(i * 13 + 7) % 100}%`,
          width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
          borderRadius:"50%",
          background: "#fff",
          opacity: Math.max(0, (0.7 - prog) * (0.4 + (i%3)*0.2)),
          animation: `twinkle ${2 + (i%3)}s ease-in-out ${(i%5)*0.4}s infinite`,
        }}/>
      ))}

      {/* ── Luna ── */}
      <div style={{
        position:"absolute", right:"12%", top:"8%",
        width:44, height:44, borderRadius:"50%",
        background:"radial-gradient(circle at 35% 35%, #fff8e0, #ffd580 40%, #ffaa20)",
        boxShadow:"0 0 30px rgba(255,200,60,.5), 0 0 60px rgba(255,180,20,.2)",
        opacity: Math.max(0, 1 - prog * 2),
      }}/>

      {/* ── Sol naciente (aparece al llegar arriba) ── */}
      <div style={{
        position:"absolute", left:"15%", top:"5%",
        width:60, height:60, borderRadius:"50%",
        background:"radial-gradient(circle, #fff 0%, #ffe066 30%, #ff8c00 70%, transparent)",
        boxShadow:"0 0 40px rgba(255,180,0,.8), 0 0 80px rgba(255,120,0,.4)",
        opacity: Math.max(0, prog * 3 - 2),
      }}/>

      {/* ── Silueta de ciudad (capas) ── */}
      {/* Capa lejana: edificios pequeños */}
      <svg style={{position:"absolute",bottom:0,left:0,width:"100%",height:"35%",pointerEvents:"none"}}
        viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bldFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${260+prog*40},60%,${10+prog*5}%)`}/>
            <stop offset="100%" stopColor={`hsl(${260+prog*40},60%,${6+prog*3}%)`}/>
          </linearGradient>
        </defs>
        <rect x="0" y="120" width="400" height="80" fill="url(#bldFar)"/>
        {[0,30,55,80,110,140,165,195,220,250,275,305,330,360,385].map((x,i)=>(
          <rect key={i} x={x} y={80+(i%4)*15} width={18+(i%3)*8} height={45-(i%4)*10}
            fill="url(#bldFar)"/>
        ))}
        {/* Ventanas parpadeantes */}
        {[10,40,70,100,135,170,200,230,260,290,320,355].map((x,i)=>(
          <rect key={`w${i}`} x={x+4} y={90+(i%3)*12} width={4} height={4}
            fill={`rgba(255,${180+i*6},${50+i*10},${0.5+i%3*0.2})`}
            opacity={0.4+(i%4)*0.15}/>
        ))}
      </svg>

      {/* Capa media: edificios más grandes con neón */}
      <svg style={{position:"absolute",bottom:0,left:0,width:"100%",height:"45%",pointerEvents:"none"}}
        viewBox="0 0 400 250" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bldMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${250+prog*40},70%,${8+prog*6}%)`}/>
            <stop offset="100%" stopColor={`hsl(${240+prog*40},65%,${4+prog*4}%)`}/>
          </linearGradient>
        </defs>
        <rect x="0" y="160" width="400" height="90" fill="url(#bldMid)"/>
        {[5,45,80,125,160,200,240,275,315,355].map((x,i)=>(
          <g key={i}>
            <rect x={x} y={60+(i%5)*20} width={30+(i%4)*12} height={105-(i%5)*20}
              fill="url(#bldMid)"/>
            {/* Antena */}
            <rect x={x+(15+(i%4)*6)} y={50+(i%5)*20} width={2} height={15} fill={`rgba(255,50,100,${0.6+i%3*0.15})`}/>
          </g>
        ))}
        {/* Ventanas con brillo neón */}
        {Array.from({length:30}).map((_,i)=>(
          <rect key={`wm${i}`}
            x={10+(i*13)%380} y={80+(i*17)%130}
            width={5} height={5}
            fill={i%3===0?"#ff4d9a":i%3===1?"#3de8ff":"#ffd23d"}
            opacity={0.35+(i%4)*0.15}
            rx={1}/>
        ))}
      </svg>

      {/* Capa delantera: edificios grandes con neón fuerte */}
      <svg style={{position:"absolute",bottom:0,left:0,width:"100%",height:"30%",pointerEvents:"none"}}
        viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bldFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0418"/>
            <stop offset="100%" stopColor="#06010d"/>
          </linearGradient>
        </defs>
        {[0,60,120,180,240,300,360].map((x,i)=>(
          <rect key={i} x={x} y={i%2===0?40:70} width={55} height={i%2===0?140:110}
            fill="url(#bldFront)"/>
        ))}
        {/* Neones en edificios frontales */}
        {[20,100,180,255,330].map((x,i)=>(
          <g key={`n${i}`}>
            <rect x={x} y={50+(i%3)*20} width={30} height={3} rx={2}
              fill={i%2===0?"#ff4d9a":"#3de8ff"}
              opacity={0.7} filter="url(#glow)"/>
          </g>
        ))}
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
      </svg>

      {/* ── Palmeras ── */}
      {[8, 88].map((side, si) => (
        <svg key={si} style={{
          position:"absolute", bottom:0,
          left: si===0 ? `${side}%` : "auto",
          right: si===1 ? `${100-side}%` : "auto",
          width:60, height:130, pointerEvents:"none", opacity:.7
        }} viewBox="0 0 60 130">
          {/* tronco */}
          <path d="M28,130 C29,100 32,70 30,10" stroke="#3d2a08" strokeWidth="5" fill="none"/>
          {/* hojas */}
          {[-40,-20,0,20,40].map((angle,i)=>(
            <g key={i} transform={`translate(30,15) rotate(${angle})`}>
              <path d="M0,0 C-15,-8 -25,-2 -30,8 C-20,2 -10,0 0,0Z"
                fill={`hsl(${130+i*5},${60-i*5}%,${20+i*5}%)`} opacity={0.85}/>
            </g>
          ))}
        </svg>
      ))}

      {/* ── Reflejo en el agua (parte inferior) ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:"18%",
        background:`linear-gradient(180deg, transparent, rgba(${prog<0.3?"61,30,120":"30,80,150"},0.4))`,
        backdropFilter:"blur(2px)",
      }}>
        {/* Ondas */}
        {[0,1,2].map(i => (
          <div key={i} style={{
            position:"absolute", left:0, right:0,
            top: `${20+i*25}%`, height:1,
            background:`rgba(${prog<0.3?"120,80,220":"61,232,255"},0.15)`,
            animation:`wave ${3+i}s ease-in-out ${i*0.5}s infinite`,
          }}/>
        ))}
      </div>

      {/* ── Neones flotantes en el aire ── */}
      {[
        {x:"15%",y:"20%",color:"#ff4d9a",txt:"BINGO"},
        {x:"65%",y:"35%",color:"#3de8ff",txt:"BOLLA"},
        {x:"40%",y:"55%",color:"#ffd23d",txt:"777"},
      ].map(({x,y,color,txt},i) => (
        <div key={i} style={{
          position:"absolute", left:x, top:y,
          color, fontSize:11, fontWeight:800, letterSpacing:3,
          fontFamily:"monospace",
          textShadow:`0 0 10px ${color}, 0 0 20px ${color}`,
          opacity: 0.12 + (i%2)*0.06,
          animation:`neonFlicker ${4+i*2}s ease-in-out ${i}s infinite`,
          pointerEvents:"none",
        }}>{txt}</div>
      ))}

      {/* ── Partículas de luz ── */}
      {Array.from({length:15}).map((_,i) => (
        <div key={`p${i}`} style={{
          position:"absolute",
          left:`${(i*23+5)%95}%`,
          top:`${(i*31+10)%90}%`,
          width:3, height:3, borderRadius:"50%",
          background: i%3===0?"#ff4d9a":i%3===1?"#3de8ff":"#ffd23d",
          opacity:0.25,
          animation:`float ${5+i%4}s ease-in-out ${i*0.3}s infinite`,
          boxShadow:`0 0 6px currentColor`,
        }}/>
      ))}
    </div>
  );
};

export default function WorldMap({ playerId }: { playerId: string }) {
  const sb = createClient();
  const [nodes, setNodes]   = useState<WNode[]>([]);
  const [xp, setXp]         = useState<XPData | null>(null);
  const [prof, setProf]     = useState<{gold_coins:number;sweeps_coins:number}|null>(null);
  const [game, setGame]     = useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [nr, xr, pr] = await Promise.all([
        sb.from("world_nodes").select("*").order("node_index"),
        sb.rpc("get_player_xp", { p_player_id: playerId }),
        sb.from("profiles").select("gold_coins,sweeps_coins").eq("id", playerId).single(),
      ]);
      if (nr.data) setNodes(nr.data);
      if (xr.data?.[0]) setXp(xr.data[0]);
      if (pr.data) setProf(pr.data);
      setLoading(false);
      setTimeout(() => {
        const active = nr.data?.find((n: WNode) => n.unlocked && !n.completed);
        if (active && mapRef.current) {
          const h = mapRef.current.scrollHeight;
          mapRef.current.scrollTo({ top: (active.pos_y/100)*h - window.innerHeight*0.55, behavior:"smooth" });
        }
      }, 700);
    }
    load();
  }, [playerId]);

  // Trackear scroll para el fondo dinámico
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loading]);

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

  const mapH = Math.max(nodes.length * 140, 2800);

  return (
    <>
      <GameOverlay
        game={game?.game ?? null} nodeId={game?.nodeId ?? null}
        level={game?.level ?? 1} playerId={playerId}
        onClose={() => setGame(null)} onComplete={handleDone}
      />

      {/* HUD fijo */}
      <div style={{ position:"fixed",top:0,left:0,right:0,zIndex:50,
        background:"linear-gradient(180deg,rgba(6,1,13,.95),transparent)",
        padding:"env(safe-area-inset-top,10px) 14px 10px",
        display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ position:"relative",width:42,height:42 }}>
            <svg width="42" height="42" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(120,80,220,.3)" strokeWidth="3"/>
              <circle cx="21" cy="21" r="17" fill="none" stroke="#C8941A" strokeWidth="3"
                strokeDasharray={`${2*Math.PI*17}`}
                strokeDashoffset={`${2*Math.PI*17*(1-(xp?.progress_pct??0)/100)}`}
                strokeLinecap="round"/>
            </svg>
            <span style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:11,fontWeight:700,color:"#C8941A" }}>
              {xp?.level??1}
            </span>
          </div>
          <div style={{ fontSize:11,color:"rgba(200,200,255,.7)" }}>
            <div style={{ fontWeight:700,color:"#C8941A",fontSize:12 }}>NV {xp?.level??1}</div>
            <div style={{ fontSize:9 }}>{fmt(xp?.xp_into_level??0)}/{fmt(xp?.xp_needed_level??100)} XP</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {[{icon:"🪙",v:prof?.gold_coins??0},{icon:"💎",v:prof?.sweeps_coins??0}].map(({icon,v},i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:4,
              background:"rgba(255,255,255,.07)",borderRadius:20,padding:"4px 10px",
              border:"1px solid rgba(255,255,255,.1)" }}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <span style={{ fontSize:12,fontWeight:700 }}>{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa scrollable */}
      <div ref={mapRef} style={{
        height:"100dvh", overflowY:"auto", overflowX:"hidden",
        position:"relative", background:"#06010d",
      }}>
        {/* Fondo CSS generativo (posición fija respecto al scroll) */}
        <div style={{ position:"sticky", top:0, height:0, overflow:"visible", zIndex:0 }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:"100dvh",zIndex:0 }}>
            <MiamiBg
              scrollY={scrollY}
              mapH={mapH}
            />
          </div>
        </div>

        {/* Contenido del mapa */}
        <div style={{ position:"relative", zIndex:2, height:`${mapH}px` }}>

          {/* Líneas de conexión entre nodos */}
          <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }}>
            {nodes.map((n,i) => {
              if (!i) return null;
              const p = nodes[i-1];
              return (
                <line key={n.node_id}
                  x1={`${p.pos_x}%`}  y1={`${(p.pos_y/100)*mapH}px`}
                  x2={`${n.pos_x}%`}  y2={`${(n.pos_y/100)*mapH}px`}
                  stroke={n.unlocked ? "rgba(120,80,220,.5)" : "rgba(60,30,100,.25)"}
                  strokeWidth="2.5"
                  strokeDasharray={n.unlocked ? "none" : "8,5"}
                />
              );
            })}
          </svg>

          {/* Nodos */}
          {nodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            const sz       = isBoss ? 78 : 64;

            const bg = !node.unlocked
              ? "rgba(15,8,35,.9)"
              : isBoss
                ? "linear-gradient(135deg,rgba(200,148,26,.3),rgba(255,50,154,.2))"
                : node.completed
                  ? "rgba(20,60,35,.9)"
                  : "rgba(25,10,60,.9)";

            const border = !node.unlocked
              ? "1.5px solid rgba(80,50,160,.3)"
              : isBoss
                ? "2.5px solid rgba(200,148,26,.85)"
                : node.completed
                  ? "2px solid rgba(45,210,110,.7)"
                  : "2px solid rgba(120,80,220,.8)";

            const shadow = isActive
              ? `0 0 ${isBoss?28:18}px ${isBoss?"rgba(200,148,26,.6)":"rgba(120,80,220,.6)"}, 0 0 ${isBoss?50:30}px ${isBoss?"rgba(200,148,26,.25)":"rgba(120,80,220,.25)"}`
              : node.completed ? "0 0 10px rgba(45,200,100,.3)" : "0 4px 12px rgba(0,0,0,.5)";

            return (
              <div
                key={node.node_id}
                onClick={() => openGame(node)}
                style={{
                  position:"absolute",
                  left: `${node.pos_x}%`,
                  top:  `${(node.pos_y/100)*mapH}px`,
                  transform:"translate(-50%,-50%)",
                  width:sz, height:sz,
                  borderRadius: isBoss ? 18 : "50%",
                  background: bg, border, boxShadow: shadow,
                  display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:1,
                  cursor: node.unlocked ? "pointer" : "default",
                  backdropFilter:"blur(10px)",
                  animation: isActive ? "nodePulse 1.8s ease-in-out infinite" : "none",
                  zIndex: isBoss ? 5 : 3,
                  transition:"transform .15s",
                }}
              >
                <span style={{ fontSize: isBoss ? 24 : 20 }}>
                  {isBoss ? "⭐" : !node.unlocked ? "🔒" : node.completed ? "✅" : "🎮"}
                </span>
                <span style={{
                  fontSize: isBoss ? 9 : 8, fontWeight:700, textAlign:"center",
                  color: isBoss ? "#C8941A" : "rgba(200,200,255,.9)",
                  maxWidth: sz-10, overflow:"hidden",
                  whiteSpace:"nowrap", textOverflow:"ellipsis",
                }}>{node.title}</span>
                {node.completed && (
                  <div style={{ display:"flex",gap:2 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:8, opacity:i<node.stars?1:.2 }}>⭐</span>
                    ))}
                  </div>
                )}
                {/* Badge nivel */}
                <span style={{
                  position:"absolute", top:-8, right:-6,
                  background: isBoss ? "linear-gradient(135deg,#C8941A,#ff8c00)" : "rgba(100,60,200,.95)",
                  borderRadius:10, fontSize:8, fontWeight:800, color:"#fff",
                  padding:"1px 5px", border:"1px solid rgba(255,255,255,.25)",
                  boxShadow: isBoss ? "0 0 8px rgba(200,148,26,.5)" : "none",
                }}>{node.node_index}</span>
              </div>
            );
          })}

          {/* Mascota sobre nodo activo */}
          {(() => {
            const active = nodes.find(n => n.unlocked && !n.completed);
            if (!active) return null;
            return (
              <div style={{
                position:"absolute",
                left:`${active.pos_x}%`,
                top:`${(active.pos_y/100)*mapH}px`,
                transform:"translate(-50%,-155%)",
                fontSize:36, lineHeight:1,
                filter:"drop-shadow(0 4px 10px rgba(0,0,0,.7))",
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
          0%,100%{box-shadow:0 0 14px rgba(120,80,220,.4),0 0 28px rgba(120,80,220,.2);transform:translate(-50%,-50%) scale(1)}
          50%{box-shadow:0 0 28px rgba(120,80,220,.7),0 0 50px rgba(120,80,220,.3);transform:translate(-50%,-50%) scale(1.07)}
        }
        @keyframes mascotBob{0%,100%{transform:translate(-50%,-155%)}50%{transform:translate(-50%,-170%)}}
        @keyframes twinkle{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        @keyframes wave{0%,100%{opacity:.15;transform:scaleX(1)}50%{opacity:.3;transform:scaleX(1.02)}}
        @keyframes neonFlicker{0%,100%{opacity:.12}45%{opacity:.18}50%{opacity:.08}55%{opacity:.18}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>
    </>
  );
}
