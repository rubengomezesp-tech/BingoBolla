"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GameOverlay, { GameType } from "@/components/GameOverlay";

type WNode = {
  node_id: string; node_index: number; node_type: string;
  title: string; pos_x: number; pos_y: number;
  target_ref: string | null; reward_xp: number; reward_gold: number; max_stars: number;
  completed: boolean; stars: number; unlocked: boolean;
};
type XPData = { level: number; xp_into_level: number; xp_needed_level: number; progress_pct: number; };
type ProfileData = { gold_coins: number; sweeps_coins: number; diamonds?: number; };
type JackpotRoom = { jackpot_gold?: number; jackpot_sweeps?: number; };
type WorldAssetRow = { asset_key: string; url: string };
type WorldAssetMap = Record<string, string>;

const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n);
const BOSS = new Set([5,10,15,20]);
const WORLD_ID = "miami_nights";
const MAP_IMG = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/bg-miami-map.png";
const MAX_ENERGY = 5;
const WORLD_NAME = "Miami Nights";
const DEFAULT_WORLD_ASSETS: WorldAssetMap = {
  "bg-miami-map": MAP_IMG,
  "node-locked": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/node-locked.PNG",
  "icon-regalo-diario": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/icon-regalo-diario-v2.PNG",
  "icon-gira-gana": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/icon-gira-gana.PNG",
  "icon-cofre-vip": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/icon-cofre-vip.PNG",
  "icon-invitar": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/icon-invitar.PNG",
  "mascot-global": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG",
  "avatar-global": "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG",
};
const GAME_CHAPTERS: Array<{ game: GameType; label: string; icon: string; assetKey: string }> = [
  { game: "ballmatch", label: "Ball Match", icon: "🎮", assetKey: "game-ballmatch" },
  { game: "neural_cascade", label: "Neural Cascade", icon: "⚡", assetKey: "game-neural-cascade" },
];

// Email admin — solo este usuario ve el editor drag-and-drop
const ADMIN_EMAIL = "rubengomezesp@gmail.com";

function normalizeNode(raw: Partial<WNode> & { id?: string }): WNode {
  const index = Number(raw.node_index ?? 0);
  return {
    node_id: String(raw.node_id ?? raw.id ?? index),
    node_index: index,
    node_type: raw.node_type ?? "minigame",
    title: raw.title ?? `Nivel ${index}`,
    pos_x: Number(raw.pos_x ?? 50),
    pos_y: Number(raw.pos_y ?? 50),
    target_ref: raw.target_ref ?? null,
    reward_xp: Number((raw as any).reward_xp ?? 50),
    reward_gold: Number((raw as any).reward_gold ?? 20),
    max_stars: Number(raw.max_stars ?? 3),
    completed: Boolean(raw.completed),
    stars: Number(raw.stars ?? 0),
    unlocked: index === 1 || Boolean(raw.unlocked),
  };
}

function normalizeAssetMap(raw: unknown): WorldAssetMap {
  if (Array.isArray(raw)) {
    return raw.reduce<WorldAssetMap>((acc, row: Partial<WorldAssetRow>) => {
      if (row.asset_key && row.url) acc[row.asset_key] = row.url;
      return acc;
    }, {});
  }
  if (raw && typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => {
        return typeof entry[1] === "string" && entry[1].length > 0;
      })
    );
  }
  return {};
}

function normalizeXp(raw: unknown): XPData | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const xp = row as Partial<XPData>;
  return {
    level: Math.max(1, Number(xp.level ?? 1)),
    xp_into_level: Number(xp.xp_into_level ?? 0),
    xp_needed_level: Number(xp.xp_needed_level ?? 100),
    progress_pct: Number(xp.progress_pct ?? 0),
  };
}

function gameForLevel(level: number) {
  const chapter = Math.floor((Math.max(1, level) - 1) / 5) % GAME_CHAPTERS.length;
  return GAME_CHAPTERS[chapter];
}

function gameForNode(node: WNode) {
  const ref = node.target_ref?.toLowerCase() ?? "";
  if (ref.includes("neural")) return GAME_CHAPTERS[1];
  if (ref.includes("ball")) return gameForLevel(node.node_index);
  return gameForLevel(node.node_index);
}

function buildSvgPath(nodes: WNode[]) {
  return nodes
    .slice()
    .sort((a, b) => a.node_index - b.node_index)
    .map((node, index) => `${index === 0 ? "M" : "L"} ${node.pos_x} ${node.pos_y}`)
    .join(" ");
}

export default function WorldMap({ playerId }: { playerId: string }) {
  const sb = createClient();
  const router = useRouter();
  const [nodes, setNodes]     = useState<WNode[]>([]);
  const [assets, setAssets]   = useState<WorldAssetMap>(DEFAULT_WORLD_ASSETS);
  const [xp, setXp]           = useState<XPData | null>(null);
  const [prof, setProf]       = useState<ProfileData | null>(null);
  const [jackpotGold, setJackpotGold] = useState(23450000);
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
      const [nr, ar, xr, pr, jr, ur] = await Promise.all([
        safe(sb.rpc("get_world_map", { p_world_id: WORLD_ID })),
        safe(sb.rpc("get_world_assets")),
        safe(sb.rpc("get_player_xp", { p_player_id: playerId })),
        safe(sb.from("profiles").select("gold_coins,sweeps_coins,diamonds").eq("id", playerId).single()),
        safe(sb.rpc("room_jackpots")),
        safe(sb.auth.getUser()),
      ]);
      if (Array.isArray(nr?.data) && nr.data.length) setNodes(nr.data.map(normalizeNode));
      setAssets({ ...DEFAULT_WORLD_ASSETS, ...normalizeAssetMap(ar?.data) });
      setXp(normalizeXp(xr?.data));
      if (pr?.data) setProf(pr.data);
      if (Array.isArray(jr?.data)) {
        const total = (jr.data as JackpotRoom[]).reduce((sum, room) => sum + Number(room.jackpot_gold ?? 0), 0);
        if (total > 0) setJackpotGold(total);
      }
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
    const nextGame = gameForNode(n);
    setGame({ game: nextGame.game, nodeId:n.node_id, level:n.node_index });
  }, [editMode]);

  const handleDone = useCallback(async (r: {win:boolean;stars:number;xp:number}) => {
    if (r.win) {
      const safe = async (p: any) => { try { return await Promise.resolve(p); } catch { return { data: null }; } };
      const [nr, xr, pr] = await Promise.all([
        safe(sb.rpc("get_world_map", { p_world_id: WORLD_ID })),
        safe(sb.rpc("get_player_xp", { p_player_id: playerId })),
        safe(sb.from("profiles").select("gold_coins,sweeps_coins,diamonds").eq("id", playerId).single()),
      ]);
      if (Array.isArray(nr?.data) && nr.data.length) setNodes(nr.data.map(normalizeNode));
      setXp(normalizeXp(xr?.data));
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
        .eq("id", n.node_id);
    }
    setDirty(false);
    alert("✅ Coordenadas guardadas en la BD");
  };

  useEffect(() => {
    if (loading || editMode || !nodes.length || !mapRef.current || !imgWrapRef.current) return;

    const active =
      nodes.find((node) => node.unlocked && !node.completed) ||
      nodes.find((node) => node.unlocked) ||
      nodes[0];

    if (!active) return;

    const scroller = mapRef.current;
    const mapHeight = imgWrapRef.current.offsetHeight;
    const target = (active.pos_y / 100) * mapHeight - scroller.clientHeight * 0.58;

    scroller.scrollTo({
      top: Math.max(0, target),
      behavior: "smooth",
    });
  }, [editMode, loading, nodes]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"#06010d", color:"rgba(200,200,255,.5)" }}>
      Cargando Miami...
    </div>
  );

  const assetUrl = (key: string) => assets[key] || DEFAULT_WORLD_ASSETS[key] || "";
  const mascot = assetUrl("mascot-global");
  const lockImg = assetUrl("node-locked");
  const mapImg = assetUrl("bg-miami-map") || MAP_IMG;

  const RAIL = [
    { key:"icon-regalo-diario", fallback:"🎁", lbl:"REGALO DIARIO",  timer:"⏱ 23h 48m",  badge:"3", bonus:false, action:()=>router.push("/regalo") },
    { key:"icon-gira-gana",        fallback:"🎡", lbl:"¡GIRA Y GANA!",  timer:"⏱ 23h 48m",   badge:"",  bonus:false, action:()=>router.push("/ruleta") },
    { key:"icon-cofre-vip",        fallback:"💎", lbl:"COFRE VIP",     timer:"⏱ 8h 12m",   badge:"",  bonus:false, action:()=>router.push("/vip") },
    { key:"icon-invitar",          fallback:"👥", lbl:"INVITAR AMIGOS", timer:"⭐ +100 💎", badge:"5", bonus:true,
      action:()=>router.push("/invitar")
    },
  ];
  const sortedNodes = nodes.slice().sort((a, b) => a.node_index - b.node_index);
  const totalNodes = sortedNodes.length || 20;
  const worldNodes = sortedNodes.map((node) => {
    return {
      ...node,
      unlocked: node.node_index === 1 || node.unlocked || node.completed,
      completed: node.completed,
      node_type: BOSS.has(node.node_index) ? "boss" : node.node_type,
    };
  });
  const activeNode =
    worldNodes.find(n => n.unlocked && !n.completed) ||
    worldNodes.find(n => n.unlocked) ||
    null;
  const completedCount = worldNodes.filter(n => n.completed).length;
  const currentLevel = activeNode?.node_index ?? Math.min(completedCount + 1, totalNodes);
  const mapPath = buildSvgPath(worldNodes);
  const unlockedPath = buildSvgPath(worldNodes.filter((node) => node.unlocked || node.completed));
  const energy = MAX_ENERGY;
  const tickets = 12;
  const diamonds = prof?.diamonds ?? Math.floor(Number(prof?.sweeps_coins ?? 0));
  const activeGame = activeNode ? gameForNode(activeNode) : GAME_CHAPTERS[0];

  return (
    <>
      <GameOverlay
        game={game?.game ?? null} nodeId={game?.nodeId ?? null}
        level={game?.level ?? 1} playerId={playerId}
        onClose={() => setGame(null)} onComplete={handleDone}
      />

      <style>{WORLD_UI_CSS}</style>

      {/* HUD superior estilo juego */}
      <div className="wm-topHud">
        <button className="wm-avatarPro" onClick={() => router.push("/account")} aria-label="Cuenta">
          <div className="wm-avatarFace">{assetUrl("avatar-global") ? <img src={assetUrl("avatar-global")} alt="" /> : "BB"}</div>
          <div className="wm-levelStar">{xp?.level ?? 1}</div>
        </button>

        <div className="wm-resourceRail">
          <button className="wm-resource" onClick={() => router.push("/store")}>
            <span className="wm-resIcon coin">🪙</span>
            <span className="wm-resValue">{fmt(prof?.gold_coins ?? 0)}</span>
            <span className="wm-plus">+</span>
          </button>
          <button className="wm-resource energy" onClick={() => router.push("/store")}>
            <span className="wm-resIcon bolt">⚡</span>
            <span className="wm-resValue">{energy}/{MAX_ENERGY}</span>
            <span className="wm-resSub">LLENO</span>
            <span className="wm-plus">+</span>
          </button>
          <button className="wm-resource" onClick={() => router.push("/store")}>
            <span className="wm-resIcon ticket">🎟️</span>
            <span className="wm-resValue">{tickets}</span>
            <span className="wm-plus">+</span>
          </button>
          <button className="wm-resource" onClick={() => router.push("/store")}>
            <span className="wm-resIcon gem">💎</span>
            <span className="wm-resValue">{fmt(diamonds)}</span>
            <span className="wm-plus">+</span>
          </button>
        </div>

        <button className="wm-menuPro" onClick={() => router.push("/account")} aria-label="Menu">
          <span />
          <span />
          <span />
          <b>1</b>
        </button>
      </div>

      <div className="wm-titleCard">
        <div className="wm-neonTitle">{WORLD_NAME}<span>🌴</span></div>
        <div className="wm-completed"><b>★</b> {completedCount}/{totalNodes} completados</div>
      </div>

      <div className="wm-jackpotPro">
        <div className="wm-jackpotTitle">JACKPOT</div>
        <div className="wm-jackpotAmount">🪙 {fmt(jackpotGold)}</div>
        <div className="wm-jackpotTimer">23h 48m</div>
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
      <div className="wm-sideRail">
        {RAIL.map(({ key, fallback, lbl, timer, badge, bonus, action }) => {
          const iconUrl = assetUrl(key);
          return (
            <div key={key} onClick={action}
              className="wm-sideRailBtn">
              <div className="wm-sideRailIcon">
                {iconUrl ? <img src={iconUrl} alt={lbl}/> : <span>{fallback}</span>}
              </div>
              {badge && (
                <div className="wm-sideBadge">{badge}</div>
              )}
              <div className="wm-sideLabel">{lbl}</div>
              <div className={`wm-sideTimer${bonus ? " bonus" : ""}`}>{timer}</div>
            </div>
          );
        })}
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
          <img src={mapImg} alt="Miami Map" draggable={false}
            style={{ display:"block", width:"100%", height:"auto" }}/>

          {mapPath && (
            <svg className="wm-pathLayer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path className="wm-pathBase" d={mapPath} />
              {unlockedPath && <path className="wm-pathUnlocked" d={unlockedPath} />}
            </svg>
          )}

          {/* Nodos */}
          {worldNodes.map(node => {
            const isBoss   = BOSS.has(node.node_index);
            const isActive = node.unlocked && !node.completed;
            const sz = isBoss ? 54 : 44;
            const isDragging = dragId === node.node_id;
            const nodeGame = gameForNode(node);
            const nodeGameAsset = assetUrl(nodeGame.assetKey);
            const state = !node.unlocked ? "locked" : node.completed ? "done" : "open";

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
                {state === "locked" ? (
                  lockImg
                    ? <img src={lockImg} alt="Bloqueado" style={{ width:sz*0.72, height:sz*0.72, objectFit:"contain" }}/>
                    : <span style={{ fontSize: isBoss ? 18 : 15 }}>🔒</span>
                ) : state === "done" ? (
                  <span style={{ fontSize: isBoss ? 18 : 15 }}>✅</span>
                ) : (
                  nodeGameAsset
                    ? <img src={nodeGameAsset} alt={nodeGame.label} style={{ width:sz*0.58, height:sz*0.58, objectFit:"contain" }}/>
                    : <span style={{ fontSize: isBoss ? 18 : 15 }}>{nodeGame.icon}</span>
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
          {!editMode && activeNode && (
            <button
              className="wm-mascotMarker"
              style={{ left:`${activeNode.pos_x}%`, top:`${activeNode.pos_y}%` }}
              onClick={() => openGame(activeNode)}
              aria-label={`Jugar nivel ${activeNode.node_index}: ${activeGame.label}`}
            >
              <span className="wm-mascotGlow" />
              {mascot ? <img src={mascot} alt="" /> : <span className="wm-mascotFallback">BB</span>}
              <b>{activeNode.node_index}</b>
            </button>
          )}
        </div>
      </div>

      {!editMode && (
        <>
          <button
            className="wm-playCta"
            onClick={() => activeNode && openGame(activeNode)}
            disabled={!activeNode}
          >
            <span>JUGAR</span>
            <em>{activeGame.label}</em>
            <b>{activeNode?.node_index ?? currentLevel}</b>
          </button>

          <div className="wm-dailyStreak">
            <div className="wm-dailyTitle">RACHA DIARIA</div>
            <div className="wm-dailyDots">
              <i className="done">✓</i>
              <i className="done">✓</i>
              <i className="now">3</i>
              <i />
              <strong>🎁</strong>
            </div>
            <div className="wm-dailyDay">Día 3 de 7</div>
          </div>
        </>
      )}

      <style>{`
        @keyframes nodePulse {
          0%,100%{transform:translate(-50%,-50%) scale(1)}
          50%{transform:translate(-50%,-50%) scale(1.1)}
        }
        @keyframes mascotBob {
          0%,100%{transform:translate(-50%,-142%)}
          50%{transform:translate(-50%,-154%)}
        }
      `}</style>
    </>
  );
}

const WORLD_UI_CSS = `
.wm-topHud{
  position:fixed;top:0;left:0;right:0;z-index:70;
  display:grid;grid-template-columns:64px minmax(0,1fr) 54px;align-items:center;gap:10px;
  padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 12px;
  background:linear-gradient(180deg,rgba(4,1,14,.82),rgba(4,1,14,.28) 68%,transparent);
  pointer-events:auto;
}
.wm-avatarPro{
  position:relative;width:58px;height:58px;border:0;border-radius:50%;padding:3px;cursor:pointer;
  background:conic-gradient(from 20deg,#ff56ba,#ffd25e,#7affb3,#7a53ff,#ff56ba);
  box-shadow:0 0 18px rgba(255,75,190,.75),0 5px 16px rgba(0,0,0,.55);
}
.wm-avatarFace{
  width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 35% 25%,#ff90cf,#51227a 58%,#17082f);
  color:#ffd98a;font-weight:900;font-size:17px;border:2px solid rgba(255,255,255,.72);overflow:hidden;
}
.wm-avatarFace img{width:100%;height:100%;object-fit:cover;}
.wm-levelStar{
  position:absolute;right:-5px;bottom:-5px;min-width:27px;height:27px;padding:0 5px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#ffe98f,#f5a61f);color:#2b1300;font-size:12px;font-weight:900;
  border:2px solid #fff;box-shadow:0 0 12px rgba(255,209,80,.8);
}
.wm-resourceRail{display:flex;align-items:center;justify-content:center;gap:10px;min-width:0;overflow-x:auto;scrollbar-width:none;}
.wm-resourceRail::-webkit-scrollbar{display:none;}
.wm-resource{
  min-width:112px;height:44px;border:1px solid rgba(174,128,255,.52);border-radius:24px;padding:4px 6px;
  display:grid;grid-template-columns:32px minmax(34px,1fr) 26px;align-items:center;gap:6px;
  background:linear-gradient(180deg,rgba(28,16,66,.92),rgba(12,6,34,.96));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 5px 16px rgba(0,0,0,.45);
  color:#fff;cursor:pointer;font:inherit;
}
.wm-resource.energy{min-width:122px;}
.wm-resIcon{
  width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 10px rgba(255,255,255,.16);
}
.wm-resIcon.coin{background:radial-gradient(circle at 35% 25%,#fff0a9,#f0a514 68%,#824900);}
.wm-resIcon.bolt{background:radial-gradient(circle at 35% 25%,#ff9cff,#e92d88 65%,#6a1c7c);}
.wm-resIcon.ticket{background:radial-gradient(circle at 35% 25%,#ffb7d8,#ea4389 65%,#8d1f5c);}
.wm-resIcon.gem{background:radial-gradient(circle at 35% 25%,#c8f4ff,#38b8f4 68%,#145d9e);}
.wm-resValue{font-size:16px;font-weight:900;white-space:nowrap;text-shadow:0 2px 5px rgba(0,0,0,.55);}
.wm-resSub{font-size:10px;font-weight:800;color:#ff9de7;margin-top:-3px;grid-column:2;line-height:1;}
.wm-plus{
  width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 35% 28%,#90ff8d,#2bbd3c 70%,#16782a);
  color:#fff;font-size:22px;font-weight:900;border:2px solid rgba(255,255,255,.86);
  box-shadow:0 0 10px rgba(67,255,93,.55);
}
.wm-menuPro{
  position:relative;width:52px;height:52px;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  background:linear-gradient(180deg,rgba(33,20,73,.95),rgba(13,6,36,.98));
  box-shadow:0 0 16px rgba(151,88,255,.45),inset 0 1px 0 rgba(255,255,255,.16);
  cursor:pointer;
}
.wm-menuPro span{display:block;width:24px;height:3px;border-radius:3px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.55);}
.wm-menuPro b{
  position:absolute;right:-2px;top:-4px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:#ff4d58;color:#fff;font-size:10px;border:1.5px solid #fff;
}
.wm-titleCard{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 82px);left:50%;transform:translateX(-50%);
  z-index:55;text-align:center;pointer-events:none;
}
.wm-neonTitle{
  min-width:330px;padding:10px 26px 8px;border-radius:20px;border:2px solid #29e8ff;
  background:linear-gradient(180deg,rgba(14,8,45,.74),rgba(8,3,25,.88));
  color:#ff72d4;font-size:36px;font-family:cursive;font-weight:700;line-height:1;
  text-shadow:0 0 9px rgba(255,76,207,.95),0 0 18px rgba(255,76,207,.7);
  box-shadow:0 0 18px rgba(45,231,255,.7),inset 0 0 18px rgba(255,68,196,.24);
}
.wm-neonTitle span{font-size:27px;margin-left:8px;text-shadow:0 0 10px rgba(83,255,170,.9);}
.wm-completed{
  display:inline-flex;align-items:center;gap:7px;margin-top:-2px;padding:5px 24px;border-radius:18px;
  background:linear-gradient(180deg,rgba(18,8,38,.95),rgba(8,3,22,.98));
  color:#fff;font-size:16px;font-weight:800;border:1px solid rgba(255,207,93,.55);
  box-shadow:0 6px 18px rgba(0,0,0,.45);
}
.wm-completed b{color:#ffd45c;text-shadow:0 0 10px rgba(255,205,70,.9);}
.wm-jackpotPro{
  position:fixed;right:24px;top:calc(env(safe-area-inset-top,0px) + 92px);z-index:54;
  min-width:210px;padding:12px 18px 14px;border-radius:18px;text-align:center;
  background:linear-gradient(180deg,rgba(96,31,51,.92),rgba(47,13,35,.96));
  border:2px solid #ffb737;box-shadow:0 0 24px rgba(255,146,51,.65),inset 0 0 16px rgba(255,211,85,.18);
}
.wm-jackpotTitle{font-size:28px;font-weight:1000;color:#ffe76b;text-shadow:0 0 12px rgba(255,218,72,.88);}
.wm-jackpotAmount{margin-top:2px;font-size:22px;font-weight:900;}
.wm-jackpotTimer{
  display:inline-block;margin-top:8px;padding:3px 16px;border-radius:16px;background:rgba(21,7,25,.78);
  font-size:17px;font-weight:800;color:#fff;
}
.wm-sideRail{
  position:fixed;left:14px;top:calc(env(safe-area-inset-top,0px) + 170px);z-index:52;
  display:flex;flex-direction:column;gap:14px;align-items:center;
}
.wm-sideRailBtn{width:78px;text-align:center;position:relative;cursor:pointer;filter:drop-shadow(0 7px 14px rgba(0,0,0,.56));}
.wm-sideRailIcon{
  width:70px;height:70px;margin:0 auto;border-radius:19px;display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:linear-gradient(180deg,rgba(44,23,86,.94),rgba(16,7,40,.96));
  border:2px solid rgba(255,205,93,.58);box-shadow:0 0 16px rgba(255,192,64,.25),inset 0 1px 0 rgba(255,255,255,.15);
}
.wm-sideRailIcon img{width:124%;height:124%;object-fit:contain;}
.wm-sideRailIcon span{font-size:35px;}
.wm-sideBadge{
  position:absolute;top:-7px;right:6px;min-width:23px;height:23px;padding:0 5px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;background:#ff4d9a;color:#fff;border:2px solid #fff;font-size:13px;font-weight:900;
}
.wm-sideLabel{margin-top:5px;font-size:10px;font-weight:900;color:#fff;line-height:1.05;text-shadow:0 2px 5px #000;}
.wm-sideTimer{display:inline-block;margin-top:3px;padding:2px 6px;border-radius:9px;background:rgba(0,0,0,.48);font-size:10px;font-weight:800;color:#ffe18a;}
.wm-sideTimer.bonus{color:#a8e8ff;}
.wm-pathLayer{
  position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none;overflow:visible;
}
.wm-pathLayer path{
  fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;
}
.wm-pathBase{
  stroke:rgba(19,8,44,.56);stroke-width:8;
  filter:drop-shadow(0 0 7px rgba(0,0,0,.8));
}
.wm-pathUnlocked{
  stroke:#b75cff;stroke-width:5;
  filter:drop-shadow(0 0 7px #b75cff) drop-shadow(0 0 14px #ff4dd8);
  stroke-dasharray:1 0;
}
.wm-mascotMarker{
  position:absolute;z-index:12;width:74px;height:74px;border:0;border-radius:50%;
  transform:translate(-50%,-142%);background:transparent;padding:0;cursor:pointer;
  animation:mascotBob 2s ease-in-out infinite;filter:drop-shadow(0 8px 15px rgba(0,0,0,.8));
}
.wm-mascotMarker img{
  position:relative;z-index:2;width:100%;height:100%;object-fit:contain;
}
.wm-mascotFallback{
  position:relative;z-index:2;width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 32% 24%,#ffb7ff,#a934ff 58%,#55149a);
  color:#fff;font-size:20px;font-weight:1000;border:2px solid rgba(255,255,255,.75);
}
.wm-mascotGlow{
  position:absolute;left:50%;bottom:0;width:48px;height:16px;border-radius:50%;transform:translateX(-50%);
  background:radial-gradient(ellipse,rgba(255,224,69,.74),rgba(183,92,255,.24) 55%,transparent 72%);
  filter:blur(1px);z-index:1;
}
.wm-mascotMarker b{
  position:absolute;right:3px;bottom:1px;z-index:3;width:23px;height:23px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fff08b,#e6a61d);
  color:#301300;border:2px solid #fff;font-size:11px;font-weight:1000;
}
.wm-playCta{
  position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 24px);transform:translateX(-50%);
  z-index:58;height:74px;min-width:244px;border-radius:28px;border:3px solid #fff3c8;cursor:pointer;
  display:grid;grid-template-columns:1fr 43px;grid-template-rows:1fr 18px;align-items:center;justify-content:center;column-gap:18px;padding:0 28px;
  background:linear-gradient(180deg,#fff07f 0%,#ffc21e 45%,#ca7808 100%);
  box-shadow:0 11px 26px rgba(0,0,0,.55),0 0 32px rgba(255,199,42,.8),inset 0 2px 0 rgba(255,255,255,.72);
  font:inherit;animation:wmPlayBreath 2.1s ease-in-out infinite;
}
.wm-playCta:disabled{opacity:.55;cursor:default;animation:none;}
.wm-playCta span{grid-column:1;grid-row:1;color:#351600;font-size:34px;font-weight:1000;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,.45);align-self:end;}
.wm-playCta em{grid-column:1;grid-row:2;color:#5a2600;font-size:12px;font-weight:1000;font-style:normal;text-transform:uppercase;letter-spacing:.05em;align-self:start;}
.wm-playCta b{
  grid-column:2;grid-row:1/3;width:43px;height:43px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#111;color:#111;
  border:3px solid #fff;box-shadow:inset 0 0 0 13px #fff,0 0 13px rgba(0,0,0,.45);font-size:17px;
}
.wm-dailyStreak{
  position:fixed;right:24px;bottom:calc(env(safe-area-inset-bottom,0px) + 98px);z-index:56;
  width:255px;padding:13px 16px;border-radius:17px;
  background:linear-gradient(180deg,rgba(41,22,80,.9),rgba(17,8,44,.96));
  border:1.5px solid rgba(255,199,82,.48);box-shadow:0 8px 22px rgba(0,0,0,.55);
}
.wm-dailyTitle{text-align:center;font-size:15px;font-weight:900;color:#fff;}
.wm-dailyDots{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0 5px;}
.wm-dailyDots i{
  width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);font-style:normal;font-size:12px;font-weight:900;
}
.wm-dailyDots i.done{background:linear-gradient(180deg,#91ff69,#24b72d);color:#072c0b;border-color:#d9ffd5;}
.wm-dailyDots i.now{background:linear-gradient(180deg,#fff08d,#e7a51c);color:#361700;border-color:#fff3bf;}
.wm-dailyDots strong{font-size:30px;margin-left:5px;line-height:1;}
.wm-dailyDay{text-align:center;color:#fff;font-size:16px;font-weight:800;}
@keyframes wmPlayBreath{
  0%,100%{box-shadow:0 11px 26px rgba(0,0,0,.55),0 0 28px rgba(255,199,42,.65),inset 0 2px 0 rgba(255,255,255,.72)}
  50%{box-shadow:0 11px 26px rgba(0,0,0,.55),0 0 48px rgba(255,214,65,.95),inset 0 2px 0 rgba(255,255,255,.72)}
}
@media(max-width:900px){
  .wm-topHud{grid-template-columns:58px minmax(0,1fr) 48px;padding-left:10px;padding-right:10px;gap:7px;}
  .wm-avatarPro{width:52px;height:52px;}
  .wm-menuPro{width:47px;height:47px;}
  .wm-resourceRail{justify-content:flex-start;}
  .wm-resource{min-width:96px;height:39px;grid-template-columns:28px minmax(28px,1fr) 22px;gap:5px;}
  .wm-resource.energy{min-width:106px;}
  .wm-resIcon{width:28px;height:28px;font-size:16px;}
  .wm-resValue{font-size:14px;}
  .wm-plus{width:22px;height:22px;font-size:19px;}
  .wm-titleCard{top:calc(env(safe-area-inset-top,0px) + 72px);}
  .wm-neonTitle{min-width:260px;font-size:27px;padding:8px 18px 7px;}
  .wm-completed{font-size:13px;padding:4px 16px;}
  .wm-jackpotPro{display:none;}
  .wm-sideRail{left:8px;top:calc(env(safe-area-inset-top,0px) + 150px);gap:11px;}
  .wm-sideRailBtn{width:66px;}
  .wm-sideRailIcon{width:58px;height:58px;border-radius:16px;}
  .wm-sideLabel{font-size:9px;}
  .wm-sideTimer{font-size:8px;}
  .wm-dailyStreak{right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 88px);width:205px;padding:10px 12px;}
  .wm-playCta{height:62px;min-width:190px;padding:0 26px;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);}
  .wm-playCta span{font-size:27px;}
  .wm-playCta b{width:36px;height:36px;box-shadow:inset 0 0 0 11px #fff,0 0 13px rgba(0,0,0,.45);}
}
@media(max-width:560px){
  .wm-dailyStreak{display:none;}
  .wm-titleCard{top:calc(env(safe-area-inset-top,0px) + 76px);}
  .wm-sideRail{top:calc(env(safe-area-inset-top,0px) + 166px);}
}
`;
