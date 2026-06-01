"use client";
import { useEffect, useState, useCallback, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  Coins,
  Crown,
  Gem,
  Gift,
  LockKeyhole,
  Menu,
  Plus,
  RotateCw,
  Save,
  Star,
  Ticket,
  UserPlus,
  Wrench,
  Zap,
} from "lucide-react";
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
const GAME_CHAPTERS: Array<{ game: GameType; label: string; short: string; assetKey: string }> = [
  { game: "ballmatch", label: "Ball Match", short: "BM", assetKey: "game-ballmatch" },
  { game: "neural_cascade", label: "Neural Cascade", short: "NC", assetKey: "game-neural-cascade" },
];
const REWARD_SPARKS = [
  { x: "-78px", y: "-34px", delay: "0ms" },
  { x: "74px", y: "-42px", delay: "45ms" },
  { x: "-52px", y: "45px", delay: "90ms" },
  { x: "58px", y: "38px", delay: "130ms" },
  { x: "0px", y: "-68px", delay: "165ms" },
  { x: "0px", y: "58px", delay: "210ms" },
];

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

export default function WorldMap({ playerId: _playerId }: { playerId: string }) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [nodes, setNodes]     = useState<WNode[]>([]);
  const [assets, setAssets]   = useState<WorldAssetMap>(DEFAULT_WORLD_ASSETS);
  const [xp, setXp]           = useState<XPData | null>(null);
  const [prof, setProf]       = useState<ProfileData | null>(null);
  const [jackpotGold, setJackpotGold] = useState(23450000);
  const [game, setGame]       = useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [rewardToast, setRewardToast] = useState<{ stars: number; xp: number; gold: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId]   = useState<string|null>(null);
  const [dirty, setDirty]     = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const rewardToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorldState = useCallback(async () => {
    const response = await fetch(`/api/world/map?worldId=${encodeURIComponent(WORLD_ID)}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return null;
    return payload as {
      map?: WNode[];
      assets?: unknown;
      xp?: unknown;
      profile?: ProfileData | null;
      jackpots?: JackpotRoom[];
      is_admin?: boolean;
    };
  }, []);

  useEffect(() => {
    async function load() {
      const state = await loadWorldState();
      if (!state) {
        setLoading(false);
        return;
      }

      if (Array.isArray(state.map) && state.map.length) setNodes(state.map.map(normalizeNode));
      setAssets({ ...DEFAULT_WORLD_ASSETS, ...normalizeAssetMap(state.assets) });
      setXp(normalizeXp(state.xp));
      if (state.profile) setProf(state.profile);
      if (Array.isArray(state.jackpots)) {
        const total = state.jackpots.reduce((sum, room) => sum + Number(room.jackpot_gold ?? 0), 0);
        if (total > 0) setJackpotGold(total);
      }
      setIsAdmin(Boolean(state.is_admin));
      setLoading(false);
    }
    load();
  }, [loadWorldState]);

  const openGame = useCallback((n: WNode) => {
    if (editMode) return; // en modo editor no se abren juegos
    if (!n.unlocked) return;
    const nextGame = gameForNode(n);
    setGame({ game: nextGame.game, nodeId:n.node_id, level:n.node_index });
  }, [editMode]);

  const handleDone = useCallback(async (r: {win:boolean;stars:number;xp:number;gold?:number;starDelta?:number}) => {
    if (r.win) {
      const xpGain = Math.max(0, Number(r.xp ?? 0));
      const goldGain = Math.max(0, Number(r.gold ?? 0));
      const starGain = Math.max(0, Number(r.starDelta ?? 0));
      if (xpGain > 0 || goldGain > 0 || starGain > 0) {
        setRewardToast({ stars: starGain, xp: xpGain, gold: goldGain });
        if (rewardToastTimerRef.current) clearTimeout(rewardToastTimerRef.current);
        rewardToastTimerRef.current = setTimeout(() => setRewardToast(null), 3600);
      }

      const state = await loadWorldState();
      if (state) {
        if (Array.isArray(state.map) && state.map.length) setNodes(state.map.map(normalizeNode));
        setXp(normalizeXp(state.xp));
        if (state.profile) setProf(state.profile);
        if (Array.isArray(state.jackpots)) {
          const total = state.jackpots.reduce((sum, room) => sum + Number(room.jackpot_gold ?? 0), 0);
          if (total > 0) setJackpotGold(total);
        }
      }
    }
    setGame(null);
  }, [loadWorldState]);

  useEffect(() => {
    return () => {
      if (rewardToastTimerRef.current) clearTimeout(rewardToastTimerRef.current);
    };
  }, []);

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
    const response = await fetch("/api/world/node-coordinates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nodes: nodes.map((node) => ({
          node_id: node.node_id,
          pos_x: node.pos_x,
          pos_y: node.pos_y,
        })),
      }),
    });

    if (!response.ok) {
      alert("No se pudieron guardar las coordenadas");
      return;
    }

    setDirty(false);
    alert("Coordenadas guardadas en la BD");
  };

  useEffect(() => {
    if (loading || !mapReady || editMode || !nodes.length || !mapRef.current || !imgWrapRef.current) return;

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
  }, [editMode, loading, mapReady, nodes]);

  if (loading) return (
    <>
      <style>{WORLD_UI_CSS}</style>
      <div className="wm-loading" role="status" aria-live="polite">
        <div className="wm-loadingMark">BB</div>
        <div>
          <p>Cargando Miami Nights</p>
          <span>Preparando mapa, premios y progreso</span>
        </div>
        <i />
      </div>
    </>
  );

  const assetUrl = (key: string) => assets[key] || DEFAULT_WORLD_ASSETS[key] || "";
  const mascot = assetUrl("mascot-global");
  const lockImg = assetUrl("node-locked");
  const mapImg = assetUrl("bg-miami-map") || MAP_IMG;

  const RAIL: Array<{ key: string; Icon: LucideIcon; lbl: string; timer: string; badge: string; bonus: boolean; action: () => void }> = [
    { key:"icon-regalo-diario", Icon: Gift, lbl:"Regalo diario",  timer:"23h 48m",  badge:"3", bonus:false, action:()=>router.push("/regalo") },
    { key:"icon-gira-gana", Icon: RotateCw, lbl:"Gira y gana",  timer:"23h 48m",   badge:"",  bonus:false, action:()=>router.push("/ruleta") },
    { key:"icon-cofre-vip", Icon: Crown, lbl:"Cofre VIP",     timer:"8h 12m",   badge:"",  bonus:false, action:()=>router.push("/vip") },
    { key:"icon-invitar", Icon: UserPlus, lbl:"Invitar amigos", timer:"+100 diamantes", badge:"5", bonus:true,
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
  const progressPct = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
  const energy = MAX_ENERGY;
  const tickets = 12;
  const diamonds = prof?.diamonds ?? Math.floor(Number(prof?.sweeps_coins ?? 0));
  const activeGame = activeNode ? gameForNode(activeNode) : GAME_CHAPTERS[0];

  return (
    <>
      <GameOverlay
        game={game?.game ?? null} nodeId={game?.nodeId ?? null}
        level={game?.level ?? 1}
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
          <button className="wm-resource" onClick={() => router.push("/store")} aria-label={`Comprar monedas. Saldo ${fmt(prof?.gold_coins ?? 0)}`}>
            <span className="wm-resIcon coin" aria-hidden="true"><Coins size={18} strokeWidth={2.6} /></span>
            <span className="wm-resValue">{fmt(prof?.gold_coins ?? 0)}</span>
            <span className="wm-plus" aria-hidden="true"><Plus size={15} strokeWidth={3} /></span>
          </button>
          <button className="wm-resource energy" onClick={() => router.push("/store")} aria-label={`Comprar energia. Energia ${energy} de ${MAX_ENERGY}`}>
            <span className="wm-resIcon bolt" aria-hidden="true"><Zap size={18} fill="currentColor" strokeWidth={2.5} /></span>
            <span className="wm-resValue">{energy}/{MAX_ENERGY}</span>
            <span className="wm-resSub">LLENO</span>
            <span className="wm-plus" aria-hidden="true"><Plus size={15} strokeWidth={3} /></span>
          </button>
          <button className="wm-resource" onClick={() => router.push("/store")} aria-label={`Comprar tickets. Saldo ${tickets}`}>
            <span className="wm-resIcon ticket" aria-hidden="true"><Ticket size={18} strokeWidth={2.5} /></span>
            <span className="wm-resValue">{tickets}</span>
            <span className="wm-plus" aria-hidden="true"><Plus size={15} strokeWidth={3} /></span>
          </button>
          <button className="wm-resource" onClick={() => router.push("/store")} aria-label={`Comprar diamantes. Saldo ${fmt(diamonds)}`}>
            <span className="wm-resIcon gem" aria-hidden="true"><Gem size={18} fill="currentColor" strokeWidth={2.4} /></span>
            <span className="wm-resValue">{fmt(diamonds)}</span>
            <span className="wm-plus" aria-hidden="true"><Plus size={15} strokeWidth={3} /></span>
          </button>
        </div>

        <button className="wm-menuPro" onClick={() => router.push("/account")} aria-label="Menu">
          <Menu size={28} strokeWidth={2.8} aria-hidden="true" />
          <b>1</b>
        </button>
      </div>

      <div className="wm-titleCard">
        <div className="wm-worldKicker">Mapa de progreso</div>
        <div className="wm-neonTitle">{WORLD_NAME}</div>
        <div className="wm-completed">
          <span><Star size={14} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> {completedCount}/{totalNodes}</span>
          <i />
          <span>Nivel {currentLevel}</span>
        </div>
      </div>

      <AnimatePresence>
        {rewardToast && (
          <motion.div
            key="world-reward-toast"
            className="wm-rewardToast"
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.94 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {!prefersReducedMotion && (
              <div className="wm-rewardBurst" aria-hidden="true">
                {REWARD_SPARKS.map((spark, index) => (
                  <i
                    key={`${spark.x}-${spark.y}-${index}`}
                    style={{
                      "--spark-x": spark.x,
                      "--spark-y": spark.y,
                      "--spark-delay": spark.delay,
                    } as CSSProperties}
                  />
                ))}
              </div>
            )}
            {rewardToast.stars > 0 && (
              <span><Star size={15} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> +{rewardToast.stars}</span>
            )}
            {rewardToast.xp > 0 && <span>+{fmt(rewardToast.xp)} XP</span>}
            {rewardToast.gold > 0 && (
              <span><Coins size={15} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> +{fmt(rewardToast.gold)}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="wm-jackpotPro">
        <div className="wm-jackpotTitle"><Crown size={20} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> Jackpot</div>
        <div className="wm-jackpotAmount"><Coins size={18} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> {fmt(jackpotGold)}</div>
        <div className="wm-jackpotTimer">23h 48m</div>
      </div>

      {/* Botón modo editor — SOLO admin */}
      {isAdmin && (
        <div className="wm-adminTools">
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={`wm-adminBtn${editMode ? " active" : ""}`}
          >
            <Wrench size={14} strokeWidth={2.5} aria-hidden="true" />
            {editMode ? "Editando" : "Editar"}
          </button>
          {editMode && dirty && (
            <button type="button" onClick={saveCoords} className="wm-adminBtn save">
              <Save size={14} strokeWidth={2.5} aria-hidden="true" />
              Guardar
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

      {!editMode && activeNode && (
        <motion.section
          className="wm-missionCard"
          aria-label={`Siguiente mision. Nivel ${activeNode.node_index}: ${activeGame.label}`}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <div className="wm-missionTop">
            <span>{BOSS.has(activeNode.node_index) ? "Boss room" : "Siguiente sala"}</span>
            <b>Nivel {activeNode.node_index}</b>
          </div>
          <strong>{activeGame.label}</strong>
          <div className="wm-missionRewards">
            <span><Star size={14} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> {activeNode.max_stars}</span>
            <span>+{fmt(activeNode.reward_xp)} XP</span>
            <span><Coins size={14} fill="currentColor" strokeWidth={2.4} aria-hidden="true" /> +{fmt(activeNode.reward_gold)}</span>
          </div>
          <div className="wm-missionTrack" aria-hidden="true">
            <i style={{ width: `${progressPct}%` }} />
          </div>
          <small>{completedCount}/{totalNodes} nodos completados</small>
        </motion.section>
      )}

      {/* Rail lateral izquierdo */}
      <div className="wm-sideRail">
        {RAIL.map(({ key, Icon, lbl, timer, badge, bonus, action }) => {
          const iconUrl = assetUrl(key);
          return (
            <button
              key={key}
              type="button"
              onClick={action}
              className="wm-sideRailBtn"
              aria-label={`${lbl}. ${timer}`}
            >
              <div className="wm-sideRailIcon">
                {iconUrl ? <img src={iconUrl} alt="" /> : <Icon size={31} strokeWidth={2.5} aria-hidden="true" />}
              </div>
              {badge && (
                <div className="wm-sideBadge">{badge}</div>
              )}
              <div className="wm-sideLabel">{lbl}</div>
              <div className={`wm-sideTimer${bonus ? " bonus" : ""}`}>{timer}</div>
            </button>
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
          <img src={mapImg} alt="Mapa de progreso de Miami Nights" draggable={false}
            onLoad={() => setMapReady(true)}
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
                className="wm-nodeMarker"
                data-node-id={node.node_id}
                data-node-index={node.node_index}
                data-game={nodeGame.game}
                onPointerDown={(e) => onPointerDown(e, node.node_id)}
                onPointerMove={(e) => onPointerMove(e, node.node_id)}
                onPointerUp={onPointerUp}
                onClick={() => openGame(node)}
                onKeyDown={(e) => {
                  if (editMode || !node.unlocked) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openGame(node);
                  }
                }}
                role={editMode ? undefined : "button"}
                tabIndex={!editMode && node.unlocked ? 0 : -1}
                aria-label={
                  !node.unlocked
                    ? `Nivel ${node.node_index} bloqueado`
                    : node.completed
                      ? `Nivel ${node.node_index} completado con ${node.stars} estrellas`
                      : `Jugar nivel ${node.node_index}: ${nodeGame.label}`
                }
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
                {isActive && !editMode && <span className="wm-nodeHalo" aria-hidden="true" />}
                {/* Icono según estado */}
                {state === "locked" ? (
                  lockImg
                    ? <img src={lockImg} alt="" style={{ width:sz*0.72, height:sz*0.72, objectFit:"contain" }}/>
                    : <LockKeyhole size={isBoss ? 22 : 18} strokeWidth={2.7} aria-hidden="true" />
                ) : state === "done" ? (
                  <Check size={isBoss ? 24 : 19} strokeWidth={3} aria-hidden="true" />
                ) : (
                  nodeGameAsset
                    ? <img src={nodeGameAsset} alt="" style={{ width:sz*0.58, height:sz*0.58, objectFit:"contain" }}/>
                    : <span className="wm-nodeLetters">{nodeGame.short}</span>
                )}
                {node.completed && !editMode && (
                  <div style={{ display:"flex", gap:1 }}>
                    {Array.from({length:node.max_stars}).map((_,i)=>(
                      <span key={i} style={{ fontSize:7, opacity:i<node.stars?1:.25 }}>★</span>
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
              data-node-id={activeNode.node_id}
              data-node-index={activeNode.node_index}
              data-game={activeGame.game}
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
        <div className="wm-mapEndPad" aria-hidden="true" />
      </div>

      {!editMode && (
        <>
          <button
            className="wm-playCta"
            data-node-id={activeNode?.node_id ?? ""}
            data-node-index={activeNode?.node_index ?? currentLevel}
            data-game={activeGame.game}
            onClick={() => activeNode && openGame(activeNode)}
            disabled={!activeNode}
            aria-label={activeNode ? `Jugar nivel ${activeNode.node_index}: ${activeGame.label}` : "Sin nivel disponible"}
          >
            <span>JUGAR</span>
            <em>{activeGame.label}</em>
            <b>{activeNode?.node_index ?? currentLevel}</b>
          </button>

          <div className="wm-dailyStreak">
            <div className="wm-dailyTitle">RACHA DIARIA</div>
            <div className="wm-dailyDots">
              <i className="done"><Check size={13} strokeWidth={3} aria-hidden="true" /></i>
              <i className="done"><Check size={13} strokeWidth={3} aria-hidden="true" /></i>
              <i className="now">3</i>
              <i />
              <strong><Gift size={30} strokeWidth={2.3} aria-hidden="true" /></strong>
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
.wm-loading{
  min-height:100dvh;display:grid;place-items:center;gap:14px;text-align:center;
  background:radial-gradient(circle at 50% 18%,rgba(255,75,190,.22),transparent 34%),#06010d;
  color:#fff;padding:32px;font-family:var(--font-sans,system-ui,sans-serif);
}
.wm-loadingMark{
  width:66px;height:66px;border-radius:22px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#ff3d7f,#ffd93d 52%,#00e5ff);color:#090413;
  font-size:20px;font-weight:1000;box-shadow:0 16px 38px rgba(0,0,0,.45);
}
.wm-loading p{margin:0;font-size:19px;font-weight:900;}
.wm-loading span{display:block;margin-top:5px;color:rgba(245,240,255,.72);font-size:14px;font-weight:650;}
.wm-loading i{
  width:min(240px,70vw);height:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.14);
}
.wm-loading i:before{
  content:"";display:block;width:42%;height:100%;border-radius:inherit;
  background:linear-gradient(90deg,#00e5ff,#ffd93d,#ff3d7f);animation:wmLoad 1.1s ease-in-out infinite;
}
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
  min-width:102px;height:42px;border:1px solid rgba(174,128,255,.46);border-radius:22px;padding:4px 6px;
  display:grid;grid-template-columns:32px minmax(34px,1fr) 26px;align-items:center;gap:6px;
  background:linear-gradient(180deg,rgba(28,16,66,.92),rgba(12,6,34,.96));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px rgba(0,0,0,.36);
  color:#fff;cursor:pointer;font:inherit;
  transition:transform .18s ease,background .18s ease,border-color .18s ease;
}
.wm-resource:hover{transform:translateY(-1px);border-color:rgba(255,217,61,.7);}
.wm-resource:active{transform:translateY(0);}
.wm-resource:focus-visible,.wm-avatarPro:focus-visible,.wm-menuPro:focus-visible,.wm-adminBtn:focus-visible,.wm-sideRailBtn:focus-visible,.wm-playCta:focus-visible,.wm-mascotMarker:focus-visible,.wm-nodeMarker:focus-visible{
  outline:3px solid rgba(0,229,255,.9);outline-offset:3px;
}
.wm-resource.energy{min-width:112px;}
.wm-resIcon{
  width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 10px rgba(255,255,255,.16);
}
.wm-resIcon.coin{background:radial-gradient(circle at 35% 25%,#fff0a9,#f0a514 68%,#824900);}
.wm-resIcon.bolt{background:radial-gradient(circle at 35% 25%,#ff9cff,#e92d88 65%,#6a1c7c);}
.wm-resIcon.ticket{background:radial-gradient(circle at 35% 25%,#ffb7d8,#ea4389 65%,#8d1f5c);}
.wm-resIcon.gem{background:radial-gradient(circle at 35% 25%,#c8f4ff,#38b8f4 68%,#145d9e);}
.wm-resIcon svg{display:block;}
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
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,rgba(33,20,73,.95),rgba(13,6,36,.98));
  box-shadow:0 0 16px rgba(151,88,255,.45),inset 0 1px 0 rgba(255,255,255,.16);
  color:#fff;cursor:pointer;
}
.wm-menuPro b{
  position:absolute;right:-2px;top:-4px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:#ff4d58;color:#fff;font-size:10px;border:1.5px solid #fff;
}
.wm-adminTools{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 58px);right:14px;z-index:60;
  display:flex;align-items:center;gap:6px;
}
.wm-adminBtn{
  height:32px;border-radius:999px;border:1px solid rgba(255,255,255,.24);padding:0 11px;
  display:inline-flex;align-items:center;gap:6px;background:rgba(25,13,58,.82);
  color:#fff;font:inherit;font-size:11px;font-weight:850;cursor:pointer;
  box-shadow:0 6px 18px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.14);
  backdrop-filter:blur(10px);
}
.wm-adminBtn.active{background:rgba(255,77,154,.9);}
.wm-adminBtn.save{background:#3ddc78;color:#032615;}
.wm-titleCard{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 78px);left:50%;transform:translateX(-50%);
  z-index:55;text-align:center;pointer-events:none;
}
.wm-worldKicker{
  display:inline-flex;margin-bottom:5px;padding:4px 12px;border-radius:999px;
  background:rgba(4,1,14,.72);border:1px solid rgba(0,229,255,.4);
  color:#a8f4ff;font-size:11px;font-weight:850;
}
.wm-neonTitle{
  min-width:310px;padding:10px 24px 9px;border-radius:18px;border:1.5px solid rgba(41,232,255,.88);
  background:linear-gradient(180deg,rgba(16,8,48,.86),rgba(8,3,25,.94));
  color:#fff;font-size:31px;font-family:var(--font-sans,system-ui,sans-serif);font-weight:1000;line-height:1;
  text-shadow:0 0 12px rgba(255,76,207,.78),0 0 22px rgba(41,232,255,.35);
  box-shadow:0 0 16px rgba(45,231,255,.42),inset 0 0 16px rgba(255,68,196,.18);
}
.wm-completed{
  display:inline-flex;align-items:center;gap:9px;margin-top:-2px;padding:6px 18px;border-radius:18px;
  background:linear-gradient(180deg,rgba(18,8,38,.95),rgba(8,3,22,.98));
  color:#fff;font-size:14px;font-weight:850;border:1px solid rgba(255,207,93,.55);
  box-shadow:0 6px 18px rgba(0,0,0,.45);
}
.wm-completed span{display:inline-flex;align-items:center;gap:5px;}
.wm-completed svg{color:#ffd45c;filter:drop-shadow(0 0 8px rgba(255,205,70,.8));}
.wm-completed i{width:1px;height:14px;background:rgba(255,255,255,.22);}
.wm-rewardToast{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 156px);left:50%;z-index:82;
  transform:translateX(-50%);min-height:44px;padding:7px 10px;border-radius:999px;
  display:flex;align-items:center;justify-content:center;gap:7px;
  background:linear-gradient(180deg,rgba(255,240,127,.98),rgba(255,172,30,.97));
  color:#351500;border:2px solid rgba(255,255,255,.78);
  box-shadow:0 12px 28px rgba(0,0,0,.42),0 0 30px rgba(255,213,61,.62);
  font-size:13px;font-weight:1000;
  pointer-events:none;white-space:nowrap;overflow:visible;
}
.wm-rewardToast span{
  position:relative;z-index:2;min-height:29px;padding:0 9px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;
  background:rgba(255,255,255,.44);box-shadow:inset 0 1px 0 rgba(255,255,255,.45);
}
.wm-rewardBurst{
  position:absolute;inset:0;z-index:1;pointer-events:none;
}
.wm-rewardBurst i{
  position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;
  background:radial-gradient(circle,#fff 0 30%,#ffe56e 34% 64%,rgba(255,77,154,.94) 70%);
  box-shadow:0 0 12px rgba(255,231,99,.95);
  animation:wmSpark .78s cubic-bezier(.16,1,.3,1) var(--spark-delay) both;
}
.wm-missionCard{
  position:fixed;left:116px;bottom:calc(env(safe-area-inset-bottom,0px) + 28px);z-index:57;
  width:286px;padding:13px 14px 14px;border-radius:18px;
  background:linear-gradient(180deg,rgba(21,11,50,.9),rgba(7,3,22,.96));
  border:1px solid rgba(0,229,255,.34);
  box-shadow:0 13px 32px rgba(0,0,0,.46),0 0 28px rgba(0,229,255,.16),inset 0 1px 0 rgba(255,255,255,.12);
  color:#fff;backdrop-filter:blur(14px);
}
.wm-missionCard:before{
  content:"";position:absolute;inset:1px;border-radius:17px;pointer-events:none;
  background:linear-gradient(135deg,rgba(255,77,154,.18),transparent 36%,rgba(0,229,255,.12));
}
.wm-missionCard > *{position:relative;z-index:1;}
.wm-missionTop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;}
.wm-missionTop span{
  min-width:0;color:#a8f4ff;font-size:10px;font-weight:950;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.wm-missionTop b{
  flex:0 0 auto;border-radius:999px;padding:4px 8px;background:rgba(255,217,61,.14);
  color:#ffe58a;border:1px solid rgba(255,217,61,.28);font-size:11px;font-weight:1000;
}
.wm-missionCard strong{display:block;font-size:20px;font-weight:1000;line-height:1.05;}
.wm-missionRewards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:11px 0 10px;}
.wm-missionRewards span{
  min-height:30px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:4px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);
  color:rgba(245,240,255,.88);font-size:11px;font-weight:950;
}
.wm-missionRewards svg{color:#ffd95c;}
.wm-missionTrack{
  height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;
  box-shadow:inset 0 1px 2px rgba(0,0,0,.45);
}
.wm-missionTrack i{
  display:block;height:100%;border-radius:inherit;
  background:linear-gradient(90deg,#00e5ff,#ffd93d,#ff4d9a);
  box-shadow:0 0 12px rgba(255,217,61,.52);
}
.wm-missionCard small{display:block;margin-top:7px;color:rgba(238,232,255,.68);font-size:11px;font-weight:750;}
.wm-jackpotPro{
  position:fixed;right:24px;top:calc(env(safe-area-inset-top,0px) + 92px);z-index:54;
  min-width:210px;padding:12px 18px 14px;border-radius:18px;text-align:center;
  background:linear-gradient(180deg,rgba(96,31,51,.92),rgba(47,13,35,.96));
  border:2px solid #ffb737;box-shadow:0 0 24px rgba(255,146,51,.65),inset 0 0 16px rgba(255,211,85,.18);
}
.wm-jackpotTitle{display:flex;align-items:center;justify-content:center;gap:7px;font-size:25px;font-weight:1000;color:#ffe76b;text-shadow:0 0 12px rgba(255,218,72,.88);}
.wm-jackpotAmount{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:4px;font-size:21px;font-weight:900;}
.wm-jackpotTimer{
  display:inline-block;margin-top:8px;padding:3px 16px;border-radius:16px;background:rgba(21,7,25,.78);
  font-size:17px;font-weight:800;color:#fff;
}
.wm-sideRail{
  position:fixed;left:14px;top:calc(env(safe-area-inset-top,0px) + 170px);z-index:52;
  display:flex;flex-direction:column;gap:14px;align-items:center;
}
.wm-sideRailBtn{
  width:78px;text-align:center;position:relative;cursor:pointer;filter:drop-shadow(0 7px 14px rgba(0,0,0,.56));
  border:0;background:transparent;color:inherit;padding:0;font:inherit;
}
.wm-sideRailIcon{
  width:70px;height:70px;margin:0 auto;border-radius:19px;display:flex;align-items:center;justify-content:center;overflow:hidden;
  background:linear-gradient(180deg,rgba(44,23,86,.94),rgba(16,7,40,.96));
  border:2px solid rgba(255,205,93,.58);box-shadow:0 0 16px rgba(255,192,64,.25),inset 0 1px 0 rgba(255,255,255,.15);
  color:#fff6c8;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
}
.wm-sideRailBtn:hover .wm-sideRailIcon{transform:translateY(-2px);border-color:rgba(0,229,255,.78);box-shadow:0 0 18px rgba(0,229,255,.35),inset 0 1px 0 rgba(255,255,255,.18);}
.wm-sideRailBtn:active .wm-sideRailIcon{transform:translateY(0);}
.wm-sideRailIcon img{width:124%;height:124%;object-fit:contain;}
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
  stroke:#b75cff;stroke-width:5;stroke-dasharray:12 10;
  animation:wmPathFlow 2.4s linear infinite;
  filter:drop-shadow(0 0 7px #b75cff) drop-shadow(0 0 14px #ff4dd8);
}
.wm-mapEndPad{height:180px;background:linear-gradient(180deg,#06010d,rgba(6,1,13,.96));}
.wm-mascotMarker{
  position:absolute;z-index:12;width:104px;height:104px;border:0;border-radius:50%;
  transform:translate(-50%,-124%);background:transparent;padding:0;cursor:pointer;
  animation:mascotBob 2s ease-in-out infinite;filter:drop-shadow(0 8px 15px rgba(0,0,0,.8));
}
.wm-mascotMarker img{
  position:relative;z-index:2;width:112%;height:112%;object-fit:contain;transform:translate(-5%,-5%);
}
.wm-mascotFallback{
  position:relative;z-index:2;width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 32% 24%,#ffb7ff,#a934ff 58%,#55149a);
  color:#fff;font-size:26px;font-weight:1000;border:2px solid rgba(255,255,255,.75);
}
.wm-mascotGlow{
  position:absolute;left:50%;bottom:4px;width:72px;height:24px;border-radius:50%;transform:translateX(-50%);
  background:radial-gradient(ellipse,rgba(255,224,69,.74),rgba(183,92,255,.24) 55%,transparent 72%);
  filter:blur(1px);z-index:1;
}
.wm-mascotMarker b{
  position:absolute;right:5px;bottom:4px;z-index:3;width:28px;height:28px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fff08b,#e6a61d);
  color:#301300;border:2px solid #fff;font-size:13px;font-weight:1000;
}
.wm-nodeMarker{isolation:isolate;}
.wm-nodeMarker svg{color:#fff;}
.wm-nodeHalo{
  position:absolute;inset:-10px;border-radius:50%;z-index:-1;pointer-events:none;
  background:radial-gradient(circle,rgba(255,222,78,.52),rgba(255,77,154,.18) 54%,transparent 72%);
  border:1px solid rgba(255,232,121,.48);
  box-shadow:0 0 22px rgba(255,217,61,.54),0 0 34px rgba(255,77,154,.22);
  animation:wmHaloSweep 1.55s ease-in-out infinite;
}
.wm-nodeLetters{font-size:12px;font-weight:1000;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.75);}
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
.wm-playCta em{grid-column:1;grid-row:2;color:#5a2600;font-size:12px;font-weight:1000;font-style:normal;text-transform:none;letter-spacing:0;align-self:start;}
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
@keyframes wmLoad{
  0%{transform:translateX(-110%)}
  100%{transform:translateX(250%)}
}
@keyframes wmSpark{
  0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}
  22%{opacity:1}
  100%{opacity:0;transform:translate(calc(-50% + var(--spark-x)),calc(-50% + var(--spark-y))) scale(1.12)}
}
@keyframes wmPathFlow{
  to{stroke-dashoffset:-22}
}
@keyframes wmHaloSweep{
  0%,100%{opacity:.72;transform:scale(.96)}
  50%{opacity:1;transform:scale(1.12)}
}
@media(max-width:900px){
  .wm-topHud{grid-template-columns:58px minmax(0,1fr) 48px;padding-left:10px;padding-right:10px;gap:7px;}
  .wm-avatarPro{width:52px;height:52px;}
  .wm-menuPro{width:47px;height:47px;}
  .wm-resourceRail{justify-content:flex-start;}
  .wm-resource{min-width:84px;height:39px;grid-template-columns:28px minmax(24px,1fr) 20px;gap:4px;}
  .wm-resource.energy{min-width:92px;}
  .wm-resIcon{width:28px;height:28px;font-size:16px;}
  .wm-resValue{font-size:13px;}
  .wm-resSub{font-size:8px;}
  .wm-plus{width:22px;height:22px;font-size:19px;}
  .wm-titleCard{top:calc(env(safe-area-inset-top,0px) + 70px);}
  .wm-worldKicker{font-size:10px;padding:3px 10px;margin-bottom:4px;}
  .wm-neonTitle{min-width:252px;font-size:26px;padding:8px 18px 7px;}
  .wm-completed{font-size:12px;padding:5px 14px;gap:8px;}
  .wm-rewardToast{top:calc(env(safe-area-inset-top,0px) + 140px);max-width:calc(100vw - 18px);overflow:visible;}
  .wm-jackpotPro{display:none;}
  .wm-missionCard{left:88px;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);width:242px;padding:12px;}
  .wm-missionCard strong{font-size:17px;}
  .wm-missionRewards{gap:5px;}
  .wm-missionRewards span{font-size:10px;}
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
  .wm-rewardToast{top:calc(env(safe-area-inset-top,0px) + 146px);gap:5px;font-size:12px;}
  .wm-rewardToast span{padding:0 7px;}
  .wm-missionCard{left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:calc(100vw - 84px);max-width:292px;}
  .wm-sideRail{left:auto;right:8px;top:calc(env(safe-area-inset-top,0px) + 156px);gap:9px;}
  .wm-sideRailBtn{width:52px;}
  .wm-sideRailIcon{width:48px;height:48px;border-radius:14px;}
  .wm-sideRailIcon svg{width:24px;height:24px;}
  .wm-sideLabel,.wm-sideTimer{display:none;}
  .wm-sideBadge{top:-6px;right:-3px;min-width:21px;height:21px;font-size:11px;}
  .wm-playCta{min-width:218px;}
}
@media(max-width:430px){
  .wm-resource{min-width:76px;grid-template-columns:26px minmax(20px,1fr) 18px;}
  .wm-resource.energy{min-width:84px;}
  .wm-resValue{font-size:12px;}
  .wm-plus{width:20px;height:20px;}
  .wm-neonTitle{min-width:226px;font-size:23px;}
  .wm-completed{font-size:11px;}
}
@media(prefers-reduced-motion:reduce){
  .wm-playCta,.wm-mascotMarker,.wm-nodeMarker,.wm-loading i:before,.wm-rewardBurst i,.wm-nodeHalo,.wm-pathUnlocked{animation:none!important;}
  .wm-resource,.wm-sideRailIcon{transition:none!important;}
}
`;
