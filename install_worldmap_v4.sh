#!/bin/bash
# ============================================================
#  BINGOBOLLA · WorldMap v4 (AUTOCONTENIDO)
#  Ajustes: iconos rail mas grandes + bola negra del mapa
#  eliminada + mascota grande sobre el nodo activo (opcion A).
#  prod NO se toca: compila solo en local.
# ============================================================
cd ~/bingobolla || { echo "No existe ~/bingobolla"; exit 1; }

echo "1/3 · Backup..."
BACKUP="src/components/WorldMap.tsx.bak.v4-$(date +%Y%m%d-%H%M%S)"
cp src/components/WorldMap.tsx "$BACKUP"
echo "    Backup: $BACKUP"

echo "2/3 · Escribiendo componente v4..."
cat > src/components/WorldMap.tsx << 'WORLDMAP_EOF'
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Node = {
  node_id: string;
  node_index: number;
  node_type: "bingo" | "minigame" | "boss" | "event" | "reward";
  title: string;
  pos_x: number;
  pos_y: number;
  target_ref: string | null;
  reward_xp: number;
  reward_gold: number;
  max_stars: number;
  completed: boolean;
  stars: number;
  unlocked: boolean;
};

type Assets = Record<string, string>;

const TYPE_ICON: Record<Node["node_type"], string> = {
  bingo: "🎱",
  minigame: "🎮",
  boss: "👑",
  event: "🎉",
  reward: "🎁",
};

export default function WorldMap({
  worldId = "miami_nights",
  worldName = "Miami Nights",
  bgUrl,
  mobileBgUrl,
}: {
  worldId?: string;
  worldName?: string;
  bgUrl: string;
  mobileBgUrl?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [assets, setAssets] = useState<Assets>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);

  const load = useCallback(async () => {
    // Nodos del mundo (igual que antes, no se toca la logica)
    const { data, error } = await supabase.rpc("get_world_map", {
      p_world_id: worldId,
    });
    if (!error && data) setNodes(data as Node[]);

    // Assets editables desde el panel admin
    const { data: a } = await supabase.rpc("get_world_assets");
    if (a) setAssets(a as Assets);

    setLoading(false);
  }, [supabase, worldId]);

  useEffect(() => {
    load();
  }, [load]);

  function onNodeClick(n: Node) {
    if (!n.unlocked) return;
    setSelected(n);
  }

  function playNode(n: Node) {
    if (n.node_type === "bingo") {
      router.push("/lobby");
    } else {
      setSelected(null);
    }
  }

  // Fondos: world_assets manda; si no hay, usa los props (fallback seguro)
  const bgDesktop = assets["bg-miami-desktop"] || bgUrl;
  const bgMobile = assets["bg-miami-mobile"] || mobileBgUrl || bgUrl;
  const done = nodes.filter((n) => n.completed).length;

  // Nodo activo = primer jugable. La mascota se coloca encima de el.
  const activeNode =
    nodes.find((n) => n.unlocked && !n.completed) ||
    nodes.find((n) => n.unlocked) ||
    null;

  const RAIL = [
    { key: "icon-regalo-diario", lbl: "REGALO DIARIO", timer: "⏱ 23h 48m", badge: "3", bonus: false },
    { key: "icon-gira-gana", lbl: "¡GIRA Y GANA!", timer: "⏱ 23h 48m", badge: "", bonus: false },
    { key: "icon-cofre-vip", lbl: "COFRE VIP", timer: "⏱ 8h 12m", badge: "", bonus: false },
    { key: "icon-invitar", lbl: "INVITAR AMIGOS", timer: "💎 +100", badge: "5", bonus: true },
  ];

  return (
    <div className="wm-root">
      <style>{WM_CSS}</style>

      {/* Fondos */}
      <div className="wm-bg wm-bg-desktop" style={{ backgroundImage: `url(${bgDesktop})` }} />
      <div className="wm-bg wm-bg-mobile" style={{ backgroundImage: `url(${bgMobile})` }} />
      <div className="wm-bg-shade" />

      {/* HUD SUPERIOR */}
      <div className="wm-hud">
        <div className="wm-avatar" aria-label="Perfil">
          <div className="wm-avatar-ph">25</div>
          <div className="wm-lvl">25</div>
        </div>
        <div className="wm-resrow">
          <div className="wm-res"><div className="wm-ic wm-ic-coin">🪙</div><div className="wm-val">245,680</div><div className="wm-add">+</div></div>
          <div className="wm-res"><div className="wm-ic wm-ic-energy">⚡</div><div><div className="wm-val">5/5</div><div className="wm-sub">LLENO</div></div><div className="wm-add">+</div></div>
          <div className="wm-res"><div className="wm-ic wm-ic-ticket">🎟️</div><div className="wm-val">12</div><div className="wm-add">+</div></div>
          <div className="wm-res"><div className="wm-ic wm-ic-gem">💎</div><div className="wm-val">1,250</div><div className="wm-add">+</div></div>
        </div>
        <div className="wm-menu"><i /><i /><i /><div className="wm-badge">1</div></div>
      </div>

      {/* BANNER CENTRAL */}
      <div className="wm-banner">
        <div className="wm-logo"><span>{worldName}</span><span className="wm-palm">🌴</span></div>
        <div className="wm-completed"><b>★</b> {done}/{nodes.length || 8} completados</div>
      </div>

      {/* JACKPOT */}
      <div className="wm-jackpot">
        <div className="wm-jp-title">JACKPOT</div>
        <div className="wm-jp-amt">🪙 23,450,000</div>
        <div className="wm-jp-timer">⏱ 23h 48m</div>
      </div>

      {/* RAIL IZQUIERDO */}
      <div className="wm-rail">
        {RAIL.map((r) => (
          <div className="wm-railbtn" key={r.key} aria-label={r.lbl}>
            <div className="wm-railic">
              {assets[r.key] ? (
                <img src={assets[r.key]} alt={r.lbl} />
              ) : (
                <div className="wm-railph">{r.lbl}</div>
              )}
            </div>
            {r.badge && <div className="wm-badge wm-railbadge">{r.badge}</div>}
            <div className="wm-raillbl">{r.lbl}</div>
            <div className={`wm-railtimer${r.bonus ? " bonus" : ""}`}>{r.timer}</div>
          </div>
        ))}
      </div>

      {/* NODOS (posiciones reales desde SQL pos_x/pos_y) */}
      <div className="wm-nodes">
        {!loading &&
          nodes.map((n) => {
            const state = n.completed ? "done" : n.unlocked ? "open" : "locked";
            const isActive = activeNode && n.node_id === activeNode.node_id;
            return (
              <button
                key={n.node_id}
                className={`wm-node wm-${state}`}
                style={{ left: `${n.pos_x}%`, top: `${n.pos_y}%` }}
                onClick={() => onNodeClick(n)}
                aria-label={n.title}
              >
                {state === "locked" ? (
                  <span className="wm-lock">🔒</span>
                ) : (
                  /* El nodo abierto/activo NO muestra la bola: ahi va la mascota */
                  !isActive && <span className="wm-nodeNum wm-nodeNum-solo">{n.node_index}</span>
                )}
                {state === "done" && (
                  <span className="wm-stars">
                    {"★".repeat(n.stars)}
                    <span className="wm-starsDim">{"★".repeat(Math.max(0, n.max_stars - n.stars))}</span>
                  </span>
                )}
                {state === "open" && !isActive && <span className="wm-pulse" />}
              </button>
            );
          })}

        {/* MASCOTA: se coloca encima del nodo activo (opcion A) */}
        {activeNode && (
          <div
            className="wm-mascot"
            style={{ left: `${activeNode.pos_x}%`, top: `${activeNode.pos_y}%` }}
            onClick={() => onNodeClick(activeNode)}
          >
            <span className="wm-mascot-pulse" />
            {assets["mascot-global"] ? (
              <img src={assets["mascot-global"]} alt="Mascota" />
            ) : (
              <span className="wm-mascot-fb">🟣</span>
            )}
          </div>
        )}
      </div>

      {/* RACHA DIARIA */}
      <div className="wm-racha">
        <div className="wm-r-title">RACHA DIARIA</div>
        <div className="wm-r-dots">
          <div className="wm-dot done">✓</div>
          <div className="wm-dot done">✓</div>
          <div className="wm-dot now">3</div>
          <div className="wm-dot todo" />
          <div className="wm-gift">🎁</div>
        </div>
        <div className="wm-r-day">Día 3 de 7</div>
      </div>

      {/* BOTON JUGAR */}
      <button
        className="wm-play"
        onClick={() => {
          const first = nodes.find((n) => n.unlocked && !n.completed) || nodes.find((n) => n.unlocked);
          if (first) onNodeClick(first);
        }}
      >
        <span className="wm-play-txt">JUGAR</span>
        <span className="wm-play-ball"><span>8</span></span>
      </button>

      {/* SHEET DEL NODO (igual que antes) */}
      {selected && (
        <div className="wm-sheet" onClick={() => setSelected(null)}>
          <div className="wm-sheetCard" onClick={(e) => e.stopPropagation()}>
            <div className="wm-sheetIcon">{TYPE_ICON[selected.node_type]}</div>
            <div className="wm-sheetTitle">{selected.title}</div>
            <div className="wm-sheetType">
              {selected.node_type === "bingo"
                ? "Partida de Bingo"
                : selected.node_type === "boss"
                ? "Nivel Jefe"
                : selected.node_type === "minigame"
                ? "Minijuego"
                : selected.node_type === "event"
                ? "Evento Especial"
                : "Recompensa"}
            </div>
            <div className="wm-sheetReward">
              Recompensa: <b>+{selected.reward_xp} EXP</b> · <b>+{selected.reward_gold.toLocaleString()} 🪙</b>
            </div>
            {selected.completed ? (
              <div className="wm-sheetDone">
                ✓ Completado · {selected.stars}/{selected.max_stars} ★
              </div>
            ) : null}
            <button className="wm-playBtn" onClick={() => playNode(selected)}>
              {selected.node_type === "bingo" ? "JUGAR ▶" : selected.completed ? "VOLVER A JUGAR" : "PRÓXIMAMENTE"}
            </button>
            <button className="wm-closeBtn" onClick={() => setSelected(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {loading && <div className="wm-loading">Cargando mundo…</div>}
    </div>
  );
}

const WM_CSS = `
.wm-root{position:relative;width:100%;min-height:100vh;min-height:100dvh;overflow:hidden;
  background:#0a0418;font-family:'Fredoka',ui-rounded,system-ui,sans-serif;color:#fff;}
.wm-bg{position:absolute;inset:0;background-size:cover;background-position:center top;background-repeat:no-repeat;}
.wm-bg-desktop{display:none;}
.wm-bg-mobile{display:block;}
.wm-bg-shade{position:absolute;inset:0;background:linear-gradient(180deg,
  rgba(8,4,20,.55) 0%,rgba(8,4,20,.05) 22%,rgba(8,4,20,0) 55%,rgba(8,4,20,.65) 100%);}

.wm-hud{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;
  gap:8px;padding:calc(env(safe-area-inset-top) + 10px) 10px 10px;}
.wm-avatar{width:54px;height:54px;border-radius:50%;flex:0 0 auto;border:3px solid #C8941A;
  position:relative;box-shadow:0 0 14px rgba(255,190,50,.6);}
.wm-avatar-ph{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;
  justify-content:center;background:radial-gradient(circle at 35% 30%,#3a2060,#1a0e36);
  font-weight:700;font-size:18px;color:#ffd98a;}
.wm-lvl{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
  background:linear-gradient(180deg,#FFD98A,#C8941A);color:#3a1f00;font-size:11px;
  font-weight:700;padding:1px 8px;border-radius:10px;border:2px solid #fff;white-space:nowrap;}
.wm-lvl::before{content:"★";margin-right:2px;}
.wm-resrow{display:flex;gap:6px;flex:1;justify-content:center;}
.wm-res{display:flex;align-items:center;gap:5px;
  background:linear-gradient(180deg,rgba(30,14,60,.92),rgba(16,8,38,.95));
  border:1.5px solid rgba(255,200,90,.4);border-radius:30px;padding:5px 6px 5px 7px;
  box-shadow:0 3px 10px rgba(0,0,0,.45);}
.wm-ic{width:24px;height:24px;border-radius:50%;flex:0 0 auto;display:flex;
  align-items:center;justify-content:center;font-size:15px;}
.wm-ic-coin{background:radial-gradient(circle at 35% 30%,#ffe48a,#e0901a 70%,#9c5e0a);}
.wm-ic-energy{background:radial-gradient(circle at 35% 30%,#7ad0ff,#2a7fd6 70%,#13508a);}
.wm-ic-ticket{background:radial-gradient(circle at 35% 30%,#ffb0d8,#e0408a 70%,#a01e5c);}
.wm-ic-gem{background:radial-gradient(circle at 35% 30%,#a8e8ff,#3aa8e0 70%,#1a6a9c);}
.wm-val{font-weight:700;font-size:13px;line-height:1;white-space:nowrap;}
.wm-sub{font-size:8px;color:#d8c7ef;font-weight:600;}
.wm-add{width:20px;height:20px;border-radius:50%;flex:0 0 auto;
  background:radial-gradient(circle at 35% 30%,#7dffb0,#3ddc78 60%,#1f9a4f);
  border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:14px;color:#fff;}
.wm-menu{width:46px;height:46px;border-radius:14px;flex:0 0 auto;position:relative;
  background:linear-gradient(180deg,rgba(30,14,60,.92),rgba(16,8,38,.95));
  border:1.5px solid rgba(255,200,90,.4);display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;box-shadow:0 3px 10px rgba(0,0,0,.45);}
.wm-menu i{display:block;width:20px;height:2.5px;background:#FFD98A;border-radius:2px;}
.wm-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;
  background:linear-gradient(180deg,#ff6b6b,#d62828);border:1.5px solid #fff;border-radius:10px;
  font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#fff;}

.wm-banner{position:absolute;top:calc(env(safe-area-inset-top) + 74px);left:50%;
  transform:translateX(-50%);z-index:20;text-align:center;}
.wm-logo{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 22px;
  border-radius:16px;background:linear-gradient(180deg,rgba(20,8,40,.5),rgba(12,6,28,.65));
  border:1.5px solid rgba(255,200,90,.35);backdrop-filter:blur(6px);}
.wm-logo span:first-child{font-family:'Pacifico',cursive;font-size:30px;
  background:linear-gradient(180deg,#ff8fd0,#ff3d7f);-webkit-background-clip:text;
  background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(255,80,160,.7));}
.wm-palm{font-size:22px;}
.wm-completed{margin-top:7px;display:inline-flex;align-items:center;gap:6px;padding:4px 14px;
  border-radius:14px;font-size:12px;font-weight:600;
  background:linear-gradient(180deg,rgba(30,14,60,.85),rgba(16,8,38,.9));
  border:1px solid rgba(255,200,90,.4);}
.wm-completed b{color:#FFD98A;font-size:16px;}

.wm-jackpot{position:absolute;top:calc(env(safe-area-inset-top) + 70px);right:10px;z-index:20;
  text-align:center;padding:6px 14px 8px;border-radius:14px;
  background:linear-gradient(180deg,#3a1a08,#1f0d04);border:2px solid #C8941A;
  box-shadow:0 0 18px rgba(255,170,40,.5),inset 0 0 12px rgba(255,170,40,.25);}
.wm-jp-title{font-family:'Pacifico',cursive;font-size:15px;color:#FFD98A;
  text-shadow:0 0 8px rgba(255,190,50,.8);}
.wm-jp-amt{font-weight:700;font-size:17px;margin:1px 0;color:#fff;
  text-shadow:0 0 8px rgba(255,200,80,.7);animation:wmShimmer 2.5s ease-in-out infinite;}
.wm-jp-timer{font-size:10px;color:#ffd9a0;background:rgba(0,0,0,.35);padding:1px 8px;
  border-radius:8px;display:inline-block;}

.wm-rail{position:absolute;left:8px;top:calc(env(safe-area-inset-top) + 150px);z-index:20;
  display:flex;flex-direction:column;gap:12px;}
.wm-railbtn{width:70px;text-align:center;position:relative;}
.wm-railic{width:60px;height:60px;margin:0 auto;border-radius:16px;position:relative;
  background:linear-gradient(180deg,rgba(40,18,78,.9),rgba(20,10,42,.95));
  border:2px solid rgba(255,200,90,.5);
  box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 14px rgba(255,170,50,.3);
  display:flex;align-items:center;justify-content:center;
  animation:wmFloaty 3s ease-in-out infinite;}
.wm-railbtn:nth-child(2) .wm-railic{animation-delay:.4s;}
.wm-railbtn:nth-child(3) .wm-railic{animation-delay:.8s;}
.wm-railbtn:nth-child(4) .wm-railic{animation-delay:1.2s;}
.wm-railic img{width:122%;height:122%;object-fit:contain;
  filter:drop-shadow(0 4px 9px rgba(0,0,0,.7));}
.wm-railph{font-size:8px;font-weight:700;color:#ffd98a;padding:4px;line-height:1.1;}
.wm-raillbl{margin-top:3px;font-size:9px;font-weight:700;color:#fff;
  text-shadow:0 1px 3px #000;line-height:1.15;}
.wm-railtimer{margin-top:1px;font-size:9px;font-weight:600;color:#FFD98A;
  background:rgba(0,0,0,.4);border-radius:7px;padding:1px 5px;display:inline-block;}
.wm-railtimer.bonus{color:#a8e8ff;}
.wm-railbadge{top:-2px;right:6px;}

.wm-nodes{position:absolute;inset:0;z-index:15;}
.wm-node{position:absolute;transform:translate(-50%,-50%);width:54px;height:54px;
  border-radius:50%;border:none;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;justify-content:center;font-family:inherit;transition:transform .15s;}
.wm-node:active{transform:translate(-50%,-50%) scale(.92);}
.wm-locked{background:radial-gradient(circle at 35% 30%,#4a3a6a,#2a1a44);
  border:2px solid rgba(255,255,255,.12);cursor:default;opacity:.7;}
.wm-lock{font-size:18px;opacity:.7;}
.wm-open{background:radial-gradient(circle at 35% 30%,#ffd98a,#e0901a 70%,#a06010);
  border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 22px rgba(255,190,50,.8);}
.wm-done{background:radial-gradient(circle at 35% 30%,#7dffb0,#2aa85a 70%,#1a7a40);
  border:3px solid rgba(255,255,255,.85);
  box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 18px rgba(60,220,120,.6);}
.wm-nodeIcon{font-size:20px;line-height:1;}
.wm-nodeNum{position:absolute;bottom:-6px;right:-6px;width:22px;height:22px;border-radius:50%;
  background:#1a0a3e;border:2px solid #fff;font-size:11px;font-weight:800;display:flex;
  align-items:center;justify-content:center;color:#fff;}
.wm-stars{position:absolute;top:-16px;font-size:11px;color:#FFD98A;white-space:nowrap;
  text-shadow:0 1px 3px #000;letter-spacing:-1px;}
.wm-starsDim{color:rgba(255,255,255,.25);}
.wm-pulse{position:absolute;inset:-3px;border-radius:50%;
  border:3px solid rgba(255,210,60,.7);animation:wmPulse 1.6s ease-out infinite;}
.wm-mascot{position:absolute;z-index:18;
  width:78px;height:78px;cursor:pointer;
  transform:translate(-50%,-78%);
  animation:wmBob 2.6s ease-in-out infinite;
  filter:drop-shadow(0 8px 14px rgba(0,0,0,.6));}
.wm-mascot img{width:100%;height:100%;object-fit:contain;}
.wm-mascot-fb{font-size:54px;}
.wm-mascot-pulse{position:absolute;left:50%;bottom:-6px;width:46px;height:14px;
  transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(ellipse,rgba(255,210,60,.55),transparent 70%);
  animation:wmGlow 1.7s ease-in-out infinite;}
.wm-nodeNum-solo{position:static;width:auto;height:auto;background:none;border:none;
  font-size:20px;color:#fff;text-shadow:0 2px 5px rgba(0,0,0,.7);}

.wm-racha{position:absolute;right:10px;bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:20;
  padding:10px 14px;border-radius:16px;text-align:center;
  background:linear-gradient(180deg,rgba(38,18,72,.9),rgba(20,10,42,.94));
  border:1.5px solid rgba(255,200,90,.4);backdrop-filter:blur(6px);
  box-shadow:0 4px 16px rgba(0,0,0,.5);}
.wm-r-title{font-size:11px;font-weight:700;color:#fff;}
.wm-r-dots{display:flex;align-items:center;gap:5px;margin:7px 0 5px;justify-content:center;}
.wm-dot{width:18px;height:18px;border-radius:50%;font-size:11px;display:flex;
  align-items:center;justify-content:center;font-weight:700;}
.wm-dot.done{background:radial-gradient(circle at 35% 30%,#7dffb0,#2aa85a);color:#063;}
.wm-dot.now{background:radial-gradient(circle at 35% 30%,#FFD98A,#C8941A);color:#3a1f00;
  box-shadow:0 0 10px rgba(255,190,50,.8);}
.wm-dot.todo{background:rgba(255,255,255,.12);}
.wm-gift{font-size:22px;}
.wm-r-day{font-size:10px;color:#FFD98A;font-weight:600;margin-top:2px;}

.wm-play{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);
  transform:translateX(-50%);z-index:25;cursor:pointer;display:flex;align-items:center;
  gap:12px;padding:15px 38px 15px 44px;border-radius:40px;border:3px solid #fff5dd;
  background:linear-gradient(180deg,#FFD98A,#C8941A 55%,#8a5e10);font-family:inherit;
  box-shadow:0 8px 26px rgba(0,0,0,.55),0 0 30px rgba(255,190,50,.7);
  animation:wmPlayPulse 2.2s ease-in-out infinite;transition:transform .12s;}
.wm-play:active{transform:translateX(-50%) scale(.95);}
.wm-play-txt{font-size:26px;font-weight:700;letter-spacing:2px;color:#3a1f00;}
.wm-play-ball{width:34px;height:34px;border-radius:50%;flex:0 0 auto;
  background:radial-gradient(circle at 35% 30%,#444,#000);display:flex;align-items:center;
  justify-content:center;border:2px solid #fff;animation:wmSpin 6s linear infinite;}
.wm-play-ball span{width:18px;height:18px;border-radius:50%;background:#fff;color:#000;
  font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;}

.wm-sheet{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;
  justify-content:center;background:rgba(10,4,24,.6);backdrop-filter:blur(4px);
  animation:wmFade .2s;}
.wm-sheetCard{width:100%;max-width:440px;border-radius:24px 24px 0 0;padding:26px 22px 30px;
  text-align:center;background:linear-gradient(180deg,#2a1456,#160a32);
  border:1px solid rgba(170,120,255,.3);border-bottom:none;
  animation:wmUp .28s cubic-bezier(.2,1,.3,1);}
.wm-sheetIcon{font-size:46px;margin-bottom:8px;}
.wm-sheetTitle{font-weight:800;font-size:22px;}
.wm-sheetType{font-size:13px;color:#c7a8e8;margin:4px 0 14px;}
.wm-sheetReward{font-size:13px;color:#e8d8f0;background:rgba(255,255,255,.06);padding:10px;
  border-radius:12px;margin-bottom:8px;}
.wm-sheetReward b{color:#FFD98A;}
.wm-sheetDone{font-size:12px;color:#7dffb0;margin-bottom:12px;}
.wm-playBtn{width:100%;padding:15px;border:none;border-radius:14px;font-family:inherit;
  font-weight:800;font-size:16px;color:#fff;cursor:pointer;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);
  box-shadow:0 6px 20px rgba(255,80,160,.5);margin-bottom:10px;}
.wm-closeBtn{width:100%;padding:11px;border:none;border-radius:12px;font-family:inherit;
  font-weight:600;font-size:13px;color:#c7a8e8;background:rgba(255,255,255,.06);cursor:pointer;}
.wm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:15px;color:#c7a8e8;z-index:60;}

@keyframes wmPulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.7);opacity:0}}
@keyframes wmBob{0%,100%{transform:translate(-50%,-78%) translateY(0)}
  50%{transform:translate(-50%,-78%) translateY(-9px)}}
@keyframes wmGlow{0%,100%{opacity:.5;transform:translateX(-50%) scale(1)}
  50%{opacity:.9;transform:translateX(-50%) scale(1.15)}}
@keyframes wmFloaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes wmShimmer{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
@keyframes wmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes wmPlayPulse{0%,100%{box-shadow:0 8px 26px rgba(0,0,0,.55),0 0 30px rgba(255,190,50,.6)}
  50%{box-shadow:0 8px 26px rgba(0,0,0,.55),0 0 46px rgba(255,200,70,.95)}}
@keyframes wmFade{from{opacity:0}to{opacity:1}}
@keyframes wmUp{from{transform:translateY(100%)}to{transform:translateY(0)}}

@media(min-width:900px){
  .wm-bg-desktop{display:block;}
  .wm-bg-mobile{display:none;}
  .wm-hud{padding:14px 18px;gap:12px;}
  .wm-avatar{width:62px;height:62px;}
  .wm-res{padding:6px 8px 6px 9px;}
  .wm-ic{width:28px;height:28px;font-size:17px;}
  .wm-val{font-size:15px;}
  .wm-menu{width:52px;height:52px;}
  .wm-logo span:first-child{font-size:38px;}
  .wm-banner{top:84px;}
  .wm-jackpot{top:80px;right:22px;padding:8px 22px 10px;}
  .wm-jp-amt{font-size:22px;}
  .wm-rail{left:16px;top:170px;gap:16px;}
  .wm-railbtn{width:84px;}
  .wm-railic{width:72px;height:72px;}
  .wm-node{width:62px;height:62px;}
  .wm-nodeIcon{font-size:24px;}
  .wm-mascot{width:96px;height:96px;}
  .wm-play-txt{font-size:30px;}
  .wm-play{padding:16px 50px 16px 56px;}
  .wm-racha{right:22px;bottom:120px;}
  .wm-sheetCard{border-radius:24px;margin-bottom:40px;}
  .wm-sheet{align-items:center;}
}
`;
WORLDMAP_EOF
echo "    Escrito ($(wc -l < src/components/WorldMap.tsx) lineas)."

echo "3/3 · Compilando..."
npm run build
RESULT=$?

echo ""
echo "===================================================="
if [ $RESULT -eq 0 ]; then
  echo "BUILD OK ✅"
  echo "Ver:  npm run dev  ->  localhost:3000/mundo"
  echo "Subir a prod si te gusta:"
  echo '  git add -A && git commit -m "WorldMap v4: iconos grandes + mascota sobre nodo" && git push origin main && vercel --prod'
else
  echo "BUILD FALLO ❌ — nuevo sigue puesto, prod intacto."
  echo "Restaurar: cp $BACKUP src/components/WorldMap.tsx"
  echo "Pega el error y lo arreglo."
fi
echo "===================================================="
