import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Coins,
  Gem,
  Gift,
  Lock,
  MapPin,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import WorldUnlockedToast from "@/components/WorldUnlockedToast";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ASSET = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/";
const MASCOT = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";
const MIAMI_MAP = `${ASSET}bg-miami-map.png`;

type MapNode = {
  node_id: string;
  node_index: number;
  node_type: "bingo" | "minigame" | "boss" | "event" | "reward";
  title: string;
  reward_xp: number;
  reward_gold: number;
  max_stars: number;
  completed: boolean;
  stars: number;
  unlocked: boolean;
};

type WorldRow = {
  id: string;
  name: string;
  ordinal: number;
  theme: string;
  unlock_level: number;
  total_nodes: number;
  active: boolean;
};

type XpData = {
  level: number;
  xp_into_level: number;
  xp_needed_level: number;
  progress_pct: number;
};

type WorldCard = {
  id: string;
  name: string;
  ordinal: number;
  theme: string;
  unlockLevel: number;
  totalNodes: number;
  completedNodes: number;
  stars: number;
  maxStars: number;
  unlocked: boolean;
  playable: boolean;
  comingSoon: boolean;
  href: string;
  accent: string;
  accent2: string;
  city: string;
  subtitle: string;
  tag: string;
};

const LEVELS_PER_WORLD = 20;

const FALLBACK_WORLDS: WorldRow[] = [
  { id: "miami_nights", name: "Miami Nights", ordinal: 1, theme: "miami", unlock_level: 1, total_nodes: 20, active: true },
  { id: "vegas_lights", name: "Vegas Lights", ordinal: 2, theme: "vegas", unlock_level: 4, total_nodes: 20, active: true },
  { id: "tokyo_rush", name: "Tokyo Rush", ordinal: 3, theme: "tokyo", unlock_level: 8, total_nodes: 20, active: true },
  { id: "rio_carnival", name: "Rio Carnival", ordinal: 4, theme: "rio", unlock_level: 12, total_nodes: 20, active: true },
  { id: "aurora_galaxy", name: "Aurora Galaxy", ordinal: 5, theme: "aurora", unlock_level: 16, total_nodes: 20, active: true },
];

// Nivel global del minijuego (1..100) en el que arranca cada mundo-capítulo.
const worldStartLevel = (ordinal: number) => (Math.max(1, ordinal) - 1) * LEVELS_PER_WORLD + 1;

const WORLD_VISUALS: Record<string, {
  accent: string;
  accent2: string;
  city: string;
  subtitle: string;
  tag: string;
}> = {
  miami_nights: {
    accent: "#ff3d7f",
    accent2: "#00e5ff",
    city: "South Beach",
    subtitle: "Bingo, Bolla Blast y jefe final de Miami.",
    tag: "Activo",
  },
  vegas_lights: {
    accent: "#ffd93d",
    accent2: "#ff6b35",
    city: "The Strip",
    subtitle: "Jackpots, cofres grandes y salas rápidas.",
    tag: "Siguiente",
  },
  tokyo_rush: {
    accent: "#00e5ff",
    accent2: "#b388ff",
    city: "Shibuya",
    subtitle: "Combos, ritmo alto y premios de precisión.",
    tag: "Avanzado",
  },
  rio_carnival: {
    accent: "#3ddc78",
    accent2: "#ff8c00",
    city: "Copacabana",
    subtitle: "Ritmo de carnaval, tucanes y cócteles tropicales.",
    tag: "Experto",
  },
  aurora_galaxy: {
    accent: "#818cf8",
    accent2: "#2dd4bf",
    city: "Cosmos",
    subtitle: "El reto final entre planetas, cometas y auroras.",
    tag: "Final",
  },
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value || 0));

const pct = (value: number, max: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
};

async function safeData<T>(promise: PromiseLike<{ data: T | null }>): Promise<T | null> {
  try {
    const result = await promise;
    return result?.data ?? null;
  } catch {
    return null;
  }
}

function normalizeXp(raw: unknown): XpData {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") {
    return { level: 1, xp_into_level: 0, xp_needed_level: 100, progress_pct: 0 };
  }
  const xp = row as Record<string, unknown>;
  const xpInto = Number(xp.xp_into_level ?? 0);
  const xpNeeded = Math.max(1, Number(xp.xp_needed_level ?? 100));
  return {
    level: Math.max(1, Number(xp.level ?? 1)),
    xp_into_level: xpInto,
    xp_needed_level: xpNeeded,
    progress_pct: Number(xp.progress_pct ?? pct(xpInto, xpNeeded)),
  };
}

function mergeWorlds(raw: unknown): WorldRow[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, Partial<WorldRow>>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const world = row as Record<string, unknown>;
    const id = String(world.id ?? "");
    if (!id) continue;
    byId.set(id, {
      id,
      name: String(world.name ?? id),
      ordinal: Number(world.ordinal ?? 99),
      theme: String(world.theme ?? id),
      unlock_level: Number(world.unlock_level ?? 1),
      total_nodes: Number(world.total_nodes ?? 0),
      active: Boolean(world.active ?? true),
    });
  }

  const merged = FALLBACK_WORLDS.map((fallback) => ({
    ...fallback,
    ...byId.get(fallback.id),
    id: fallback.id,
  }));

  for (const [id, row] of byId) {
    if (!merged.some((world) => world.id === id)) {
      merged.push({
        id,
        name: row.name ?? id,
        ordinal: row.ordinal ?? 99,
        theme: row.theme ?? id,
        unlock_level: row.unlock_level ?? 1,
        total_nodes: row.total_nodes ?? 0,
        active: row.active ?? true,
      });
    }
  }

  return merged
    .filter((world) => world.active)
    .sort((a, b) => a.ordinal - b.ordinal)
    .slice(0, 5);
}

function displayName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function MundosPage() {
  const supabase = await createClient();
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) throw new Error("Supabase service role is not configured");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await safeData<Profile>(
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>()
  );

  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const [mapRows, xpRows, worldRows] = await Promise.all([
    safeData<MapNode[]>(
      serviceSupabase.rpc("service_get_world_map", {
        p_actor_id: user.id,
        p_world_id: "miami_nights",
      })
    ),
    safeData<unknown>(
      serviceSupabase.rpc("service_get_player_xp", {
        p_actor_id: user.id,
        p_player_id: user.id,
      })
    ),
    safeData<WorldRow[]>(
      supabase
        .from("worlds")
        .select("id, name, ordinal, theme, unlock_level, total_nodes, active")
        .eq("active", true)
        .order("ordinal", { ascending: true })
    ),
  ]);

  const miamiNodes = Array.isArray(mapRows) ? mapRows : [];
  const completedNodes = miamiNodes.filter((node) => node.completed).length;
  const activeNode = miamiNodes.find((node) => node.unlocked && !node.completed) ?? miamiNodes.find((node) => node.unlocked) ?? null;
  const miamiStars = miamiNodes.reduce((sum, node) => sum + Number(node.stars ?? 0), 0);
  const miamiMaxStars = Math.max(
    24,
    miamiNodes.reduce((sum, node) => sum + Number(node.max_stars ?? 3), 0)
  );
  const xp = normalizeXp(xpRows);
  const sourceWorlds = mergeWorlds(worldRows);
  const username =
    profile.username ||
    profile.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "BingoStar";

  const worlds: WorldCard[] = sourceWorlds.map((world) => {
    const visual = WORLD_VISUALS[world.id] ?? {
      accent: "#b388ff",
      accent2: "#00e5ff",
      city: displayName(world.theme),
      subtitle: "Nuevo destino de BingoBolla.",
      tag: "Mundo",
    };
    const isMiami = world.id === "miami_nights";
    const totalNodes = Math.max(world.total_nodes || 0, LEVELS_PER_WORLD, isMiami ? miamiNodes.length || 8 : 0);
    const maxStars = isMiami ? miamiMaxStars : Math.max(30, totalNodes * 3 || 30);
    const unlocked = xp.level >= world.unlock_level;
    const playable = unlocked;
    // Miami abre el mapa interactivo; el resto entra al juego temático en su nivel inicial.
    const href = !unlocked
      ? "#"
      : isMiami
        ? "/mundomiami"
        : `/play/ballmatch?level=${worldStartLevel(world.ordinal)}`;
    return {
      id: world.id,
      name: displayName(world.name),
      ordinal: world.ordinal,
      theme: world.theme,
      unlockLevel: world.unlock_level,
      totalNodes,
      completedNodes: isMiami ? completedNodes : 0,
      stars: isMiami ? miamiStars : 0,
      maxStars,
      unlocked,
      playable,
      comingSoon: false,
      href,
      ...visual,
    };
  });

  const totalStars = worlds.reduce((sum, world) => sum + world.stars, 0);
  const totalMaxStars = worlds.reduce((sum, world) => sum + world.maxStars, 0);
  const playableWorld = worlds.find((world) => world.playable) ?? null;
  const nextLockedWorld = worlds.find((world) => !world.unlocked) ?? null;
  const nextUnlockLevel = nextLockedWorld?.unlockLevel ?? xp.level;
  const levelsToNext = Math.max(0, nextUnlockLevel - xp.level);
  const xpPercent = Math.max(0, Math.min(100, xp.progress_pct));
  const diamonds = Number((profile as any).diamonds ?? 0);

  return (
    <div className="mw-root">
      <style>{CSS}</style>
      <WorldUnlockedToast
        level={xp.level}
        worlds={sourceWorlds.map((world) => ({
          id: world.id,
          name: displayName(world.name),
          unlock_level: world.unlock_level,
        }))}
      />

      <div className="mw-backdrop" aria-hidden>
        <img src={MIAMI_MAP} alt="" />
      </div>

      <aside className="mw-side" aria-label="Navegacion de BingoBolla">
        <Link className="mw-brand" href="/lobby" aria-label="Volver al lobby">
          <span>BINGO</span>
          <strong>BOLLA</strong>
        </Link>
        <nav className="mw-nav">
          <NavLink href="/lobby" icon={ArrowLeft} label="Lobby" />
          <NavLink href="/mundos" icon={MapPin} label="Mundos" active />
          <NavLink href="/lobby#salas" icon={Users} label="Salas" />
          <NavLink href="/store" icon={Store} label="Tienda" />
          <NavLink href="/cofres" icon={Gift} label="Cofres" badge="3" />
        </nav>
        <div className="mw-guard">
          <ShieldCheck size={18} />
          <span>Juego +18. Gold Coins sin valor monetario.</span>
        </div>
      </aside>

      <main className="mw-shell">
        <header className="mw-topbar">
          <Link className="mw-return" href="/lobby" aria-label="Volver al lobby">
            <ArrowLeft size={18} />
          </Link>

          <section className="mw-player" aria-label="Perfil y progreso">
            <div className="mw-avatar" aria-hidden>{username.slice(0, 1).toUpperCase()}</div>
            <div className="mw-playerText">
              <strong>{username}</strong>
              <span>Nivel {fmt(xp.level)} · {fmt(xp.xp_into_level)} / {fmt(xp.xp_needed_level)} XP</span>
            </div>
            <div className="mw-level">{xp.level}</div>
            <div className="mw-xpTrack" aria-hidden>
              <i style={{ width: `${xpPercent}%` }} />
            </div>
          </section>

          <section className="mw-wallet" aria-label="Wallet">
            <WalletPill href="/store" icon={Coins} value={fmt(profile.gold_coins)} label="Gold" />
            <WalletPill href="/store" icon={Gem} value={fmt(profile.sweeps_coins)} label="Sweeps" />
            <WalletPill href="/store" icon={Zap} value={fmt(diamonds || 5)} label="Energía" />
          </section>
        </header>

        <section className="mw-hero" aria-labelledby="world-title">
          <div className="mw-heroCopy">
            <p className="mw-kicker"><Sparkles size={15} /> Bingo World</p>
            <h1 id="world-title">El mapa de premios empieza en Miami.</h1>
            <p>
              Avanza por nodos, gana estrellas y sube de nivel para abrir nuevos destinos.
              Cada bloqueo muestra qué falta y cada acción lleva a una ruta real.
            </p>
            <div className="mw-heroActions">
              {playableWorld ? (
                <Link className="mw-primary" href={playableWorld.href}>
                  <Play size={18} />
                  Continuar {playableWorld.name}
                </Link>
              ) : (
                <Link className="mw-primary" href="/lobby#salas">
                  <Play size={18} />
                  Jugar salas
                </Link>
              )}
              <Link className="mw-secondary" href="/cofres">
                <Gift size={18} />
                Abrir cofres
              </Link>
            </div>
          </div>

          <div className="mw-heroMap" aria-label="Progreso actual de Miami">
            <img src={MIAMI_MAP} alt="Mapa Miami Nights" />
            <div className="mw-mapOverlay" />
            <div className="mw-routeLine" aria-hidden />
            <div className="mw-currentPin">
              <img src={MASCOT} alt="" />
              <span>{activeNode ? `Nodo ${activeNode.node_index}` : "Inicio"}</span>
            </div>
            <div className="mw-mapStats">
              <b>{completedNodes}/{miamiNodes.length || 8}</b>
              <span>nodos completados</span>
            </div>
          </div>
        </section>

        <section className="mw-summary" aria-label="Resumen del progreso">
          <SummaryCard icon={Star} label="Estrellas" value={`${fmt(totalStars)} / ${fmt(totalMaxStars)}`} detail="Total visible en mundos" />
          <SummaryCard icon={Trophy} label="Miami" value={`${completedNodes}/${miamiNodes.length || 8}`} detail="Ruta activa" />
          <SummaryCard
            icon={Lock}
            label="Próximo mundo"
            value={nextLockedWorld ? nextLockedWorld.name : "Todo abierto"}
            detail={nextLockedWorld ? `${levelsToNext} nivel${levelsToNext === 1 ? "" : "es"} para abrir` : "Sigue acumulando estrellas"}
          />
        </section>

        <section className="mw-contentGrid">
          <div className="mw-worlds" aria-label="Mundos disponibles">
            <div className="mw-sectionHead">
              <div>
                <h2>Mundos</h2>
                <p>Estado real por nivel de jugador y nodos disponibles.</p>
              </div>
              <span>{worlds.length} destinos</span>
            </div>

            <div className="mw-worldGrid">
              {worlds.map((world) => (
                <WorldCardView key={world.id} world={world} />
              ))}
            </div>
          </div>

          <aside className="mw-panel" aria-label="Siguiente acción">
            <div className="mw-panelTop">
              <span><Sparkles size={16} /> Próximo paso</span>
              <strong>{activeNode ? activeNode.title : "Entrar al mapa"}</strong>
              <p>
                {activeNode
                  ? `Completa el nodo ${activeNode.node_index} para ganar hasta ${fmt(activeNode.reward_gold)} Gold y ${fmt(activeNode.reward_xp)} XP.`
                  : "Entra a Miami para activar tu primer nodo de progresión."}
              </p>
            </div>

            <div className="mw-taskList">
              <ActionRow href="/games/worldmap.html" icon={MapPin} title="Campaña · 100 niveles" detail="Mapa completo de los 5 mundos" enabled />
              <ActionRow href="/play/ballmatch?level=1" icon={Sparkles} title="Bolla Blast" detail="Minijuego rápido para entrenar" enabled />
              <ActionRow href="/lobby#salas" icon={Users} title="Bingo en vivo" detail="Salas reales con cartones" enabled />
              <ActionRow href="/store" icon={Store} title="Tienda" detail="Recarga monedas y energía" enabled />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <Link className={`mw-navItem${active ? " active" : ""}`} href={href}>
      <Icon size={18} />
      <span>{label}</span>
      {badge && <b>{badge}</b>}
    </Link>
  );
}

function WalletPill({
  href,
  icon: Icon,
  value,
  label,
}: {
  href: string;
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <Link className="mw-walletPill" href={href} aria-label={`${label}: ${value}`}>
      <Icon size={17} />
      <strong>{value}</strong>
      <span>+</span>
    </Link>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="mw-summaryCard">
      <Icon size={19} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function WorldCardView({ world }: { world: WorldCard }) {
  const progress = pct(world.completedNodes, world.totalNodes || 1);
  const style = {
    "--accent": world.accent,
    "--accent-2": world.accent2,
  } as CSSProperties;
  const content = (
    <>
      <div className="mw-worldArt" aria-hidden>
        <span>{world.ordinal}</span>
      </div>
      <div className="mw-worldBody">
        <div className="mw-worldMeta">
          <span>{world.tag}</span>
          <small>{world.city}</small>
        </div>
        <h3>{world.name}</h3>
        <p>{world.subtitle}</p>
        <div className="mw-worldStats">
          <span><Star size={14} /> {fmt(world.stars)} / {fmt(world.maxStars)}</span>
          <span>{world.completedNodes}/{world.totalNodes || 1} nodos</span>
        </div>
        <div className="mw-worldProgress" aria-label={`Progreso ${Math.round(progress)}%`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="mw-worldCta">
          {world.playable ? (
            <>
              Entrar al mapa <ChevronRight size={16} />
            </>
          ) : world.comingSoon ? (
            <>
              Ruta en preparación <Lock size={15} />
            </>
          ) : (
            <>
              Nivel {world.unlockLevel} requerido <Lock size={15} />
            </>
          )}
        </div>
      </div>
    </>
  );

  if (!world.playable) {
    return (
      <article
        className={`mw-worldCard${world.unlocked ? " soon" : " locked"}`}
        style={style}
        data-testid={`world-card-${world.id}`}
        aria-label={`${world.name}. ${world.unlocked ? "Ruta en preparación" : `Bloqueado hasta nivel ${world.unlockLevel}`}`}
      >
        {content}
      </article>
    );
  }

  return (
    <Link
      className="mw-worldCard playable"
      style={style}
      href={world.href}
      data-testid={`world-card-${world.id}`}
      aria-label={`Entrar a ${world.name}`}
    >
      {content}
    </Link>
  );
}

function ActionRow({
  href,
  icon: Icon,
  title,
  detail,
  enabled,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  enabled: boolean;
}) {
  const body: ReactNode = (
    <>
      <span><Icon size={18} /></span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight size={16} />
    </>
  );

  if (!enabled) {
    return <div className="mw-action disabled" aria-disabled="true">{body}</div>;
  }

  // Archivos estáticos en /public (p.ej. el mapa de la campaña) requieren
  // navegación completa, no el router de Next.
  if (href.startsWith("/games/")) {
    return <a className="mw-action" href={href}>{body}</a>;
  }

  return <Link className="mw-action" href={href}>{body}</Link>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800&family=Geist:wght@500;600;700;800;900&display=swap');
.mw-root{min-height:100vh;background:#07070c;color:#f8f7ff;font-family:'Geist',system-ui,sans-serif;position:relative;overflow-x:hidden;padding-left:248px}
.mw-root *{box-sizing:border-box}.mw-root a{color:inherit;text-decoration:none}
.mw-backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;background:#07070c}
.mw-backdrop:before{content:"";position:absolute;inset:0;background:radial-gradient(70% 55% at 18% 10%,rgba(255,61,127,.26),transparent 58%),radial-gradient(70% 65% at 80% 16%,rgba(0,229,255,.16),transparent 60%),radial-gradient(60% 56% at 58% 94%,rgba(255,217,61,.13),transparent 55%),linear-gradient(180deg,rgba(7,7,12,.74),#07070c 76%);z-index:1}
.mw-backdrop img{position:absolute;inset:auto -14% -18% auto;width:min(980px,82vw);height:min(720px,78vh);object-fit:cover;opacity:.18;filter:saturate(1.2) contrast(1.05)}
.mw-side{position:fixed;z-index:5;left:0;top:0;bottom:0;width:248px;padding:24px 18px;display:flex;flex-direction:column;gap:24px;background:linear-gradient(180deg,rgba(13,13,24,.96),rgba(8,8,14,.98));border-right:1px solid rgba(255,255,255,.08)}
.mw-brand{display:grid;gap:0;font-family:'Fredoka',system-ui,sans-serif;line-height:.82;width:max-content}.mw-brand span{font-size:34px;font-weight:800;color:#fff}.mw-brand strong{font-size:34px;color:#ffd93d;text-shadow:0 0 18px rgba(255,217,61,.4)}
.mw-nav{display:grid;gap:8px}.mw-navItem{height:44px;padding:0 12px;border-radius:12px;display:flex;align-items:center;gap:11px;color:#cbc6dd;font-weight:800;font-size:14px}.mw-navItem svg{color:#8d86a4}.mw-navItem:hover,.mw-navItem.active{background:rgba(255,255,255,.07);color:#fff}.mw-navItem.active svg{color:#00e5ff}.mw-navItem b{margin-left:auto;min-width:22px;height:22px;border-radius:999px;display:grid;place-items:center;background:#ff3d7f;font-size:12px;color:#fff}
.mw-guard{margin-top:auto;padding:13px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:flex;gap:10px;color:#b9b4ca;font-size:12px;line-height:1.35}.mw-guard svg{flex:0 0 auto;color:#00e676}
.mw-shell{position:relative;z-index:2;width:min(1220px,100%);margin:0 auto;padding:18px 22px 44px}
.mw-topbar{display:flex;align-items:center;gap:14px;min-height:72px}.mw-return{width:44px;height:44px;border-radius:12px;display:none;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.09)}
.mw-player{position:relative;min-width:310px;max-width:430px;height:58px;display:grid;grid-template-columns:44px minmax(0,1fr) 38px;align-items:center;gap:11px;padding:7px 9px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
.mw-avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 25%,#ff8fc2,#ff3d7f 62%,#8b1648);font-weight:900;font-size:19px}.mw-playerText{min-width:0}.mw-playerText strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}.mw-playerText span{display:block;margin-top:2px;color:#bdb6d1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mw-level{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#171725;border:2px solid #ffd93d;color:#ffd93d;font-weight:900}.mw-xpTrack{position:absolute;left:64px;right:52px;bottom:6px;height:5px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}.mw-xpTrack i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#00e5ff,#ff3d7f,#ffd93d)}
.mw-wallet{margin-left:auto;display:flex;gap:9px;overflow:auto;padding-bottom:2px}.mw-walletPill{height:42px;min-width:112px;padding:0 10px;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-weight:900}.mw-walletPill svg{color:#ffd93d}.mw-walletPill span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#00a85a;color:#fff;font-size:15px}
.mw-hero{min-height:432px;display:grid;grid-template-columns:minmax(320px,.9fr) minmax(420px,1.1fr);gap:20px;align-items:stretch;margin-top:8px}.mw-heroCopy{padding:46px 30px 30px;border-radius:18px;background:linear-gradient(145deg,rgba(20,20,34,.86),rgba(12,12,20,.92));border:1px solid rgba(255,255,255,.1);position:relative;overflow:hidden}.mw-heroCopy:before{content:"";position:absolute;inset:0;background:radial-gradient(74% 70% at 16% 6%,rgba(255,61,127,.22),transparent 62%);pointer-events:none}.mw-heroCopy>*{position:relative}.mw-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:8px 11px;border-radius:999px;background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.22);color:#9af7ff;font-size:13px;font-weight:900}.mw-hero h1{font-family:'Fredoka',system-ui,sans-serif;font-size:58px;line-height:.93;letter-spacing:0;margin:0;max-width:620px;text-wrap:balance}.mw-hero p{max-width:58ch;margin:16px 0 0;color:#d8d2e7;line-height:1.55;font-size:16px}.mw-heroActions{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.mw-primary,.mw-secondary{height:46px;border-radius:13px;display:inline-flex;align-items:center;gap:9px;padding:0 16px;font-weight:900}.mw-root .mw-primary{background:#ffd93d;color:#19130a}.mw-root .mw-secondary{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff}
.mw-heroMap{position:relative;min-height:432px;border-radius:18px;overflow:hidden;background:#10101a;border:1px solid rgba(255,255,255,.1)}.mw-heroMap>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.16) contrast(1.05)}.mw-mapOverlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,7,12,.2),rgba(7,7,12,.68)),linear-gradient(180deg,transparent,rgba(7,7,12,.78))}.mw-routeLine{position:absolute;left:12%;right:18%;bottom:24%;height:120px;border-bottom:9px dashed rgba(255,255,255,.82);border-radius:50%;transform:rotate(-7deg);filter:drop-shadow(0 0 9px rgba(255,217,61,.7))}.mw-currentPin{position:absolute;left:38%;bottom:29%;display:grid;place-items:center;gap:6px;transform:translate(-50%,0)}.mw-currentPin img{width:116px;height:116px;object-fit:contain;filter:drop-shadow(0 18px 22px rgba(0,0,0,.62))}.mw-currentPin span{padding:6px 10px;border-radius:999px;background:rgba(7,7,12,.82);border:1px solid rgba(255,255,255,.16);font-size:12px;font-weight:900}.mw-mapStats{position:absolute;right:16px;bottom:16px;width:166px;padding:13px;border-radius:14px;background:rgba(8,8,14,.86);border:1px solid rgba(255,255,255,.12)}.mw-mapStats b{display:block;font-size:28px;color:#ffd93d}.mw-mapStats span{display:block;color:#cbc6dd;font-size:12px}
.mw-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.mw-summaryCard{min-height:102px;padding:17px;border-radius:16px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);display:flex;gap:13px;align-items:flex-start}.mw-summaryCard>svg{color:#00e5ff;flex:0 0 auto;margin-top:2px}.mw-summaryCard span{display:block;color:#a9a2bb;font-size:12px;font-weight:800}.mw-summaryCard strong{display:block;margin-top:3px;font-size:21px;color:#fff}.mw-summaryCard p{margin:4px 0 0;color:#cfc9de;font-size:13px;line-height:1.35}
.mw-contentGrid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;margin-top:16px}.mw-sectionHead{display:flex;justify-content:space-between;gap:14px;align-items:end;margin-bottom:12px}.mw-sectionHead h2{font-size:25px;margin:0;font-family:'Fredoka',system-ui,sans-serif;letter-spacing:0}.mw-sectionHead p{margin:3px 0 0;color:#b9b4ca;font-size:14px}.mw-sectionHead>span{white-space:nowrap;align-self:center;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.06);font-size:12px;font-weight:900;color:#d9d4e7}
.mw-worldGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.mw-worldCard{position:relative;min-height:304px;border-radius:16px;padding:17px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.1);transition:transform .18s ease,border-color .18s ease,background .18s ease}.mw-worldCard:before{content:"";position:absolute;inset:-40% -45% auto auto;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,var(--accent),transparent 68%);opacity:.24}.mw-worldCard.playable:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 45%,white 12%);background:linear-gradient(180deg,rgba(255,255,255,.095),rgba(255,255,255,.04))}.mw-worldCard.locked{filter:saturate(.72)}.mw-worldCard.locked:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(7,7,12,.34));pointer-events:none}.mw-worldCard.soon{border-color:rgba(255,217,61,.24)}.mw-worldArt{position:relative;width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.96),var(--accent) 18%,var(--accent-2) 72%);box-shadow:0 14px 32px rgba(0,0,0,.32)}.mw-worldArt span{font-family:'Fredoka',system-ui,sans-serif;font-size:36px;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.36)}.mw-worldBody{position:relative}.mw-worldMeta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.mw-worldMeta span,.mw-worldMeta small{font-size:11px;font-weight:900}.mw-worldMeta span{padding:5px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:color-mix(in srgb,var(--accent) 80%,white 20%)}.mw-worldMeta small{color:#bdb7ca}.mw-worldCard h3{margin:0;font-size:27px;font-family:'Fredoka',system-ui,sans-serif;letter-spacing:0}.mw-worldCard p{min-height:42px;margin:8px 0 0;color:#d6d0df;font-size:13px;line-height:1.42}.mw-worldStats{display:flex;justify-content:space-between;gap:8px;margin-top:14px;color:#f2edf8;font-size:12px;font-weight:900}.mw-worldStats span:first-child{display:flex;align-items:center;gap:5px}.mw-worldStats svg{color:#ffd93d;fill:#ffd93d}.mw-worldProgress{height:8px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:9px}.mw-worldProgress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent-2))}.mw-worldCta{margin-top:13px;min-height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.075);font-size:13px;font-weight:900;color:#fff}.mw-worldCard.playable .mw-worldCta{background:#fff;color:#101018}.mw-worldCard.locked .mw-worldCta{color:#c4bece}
.mw-panel{align-self:start;border-radius:16px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);overflow:hidden}.mw-panelTop{padding:18px 18px 16px;background:linear-gradient(180deg,rgba(255,61,127,.14),rgba(255,255,255,0))}.mw-panelTop span{display:inline-flex;align-items:center;gap:7px;color:#ffd93d;font-size:12px;font-weight:900}.mw-panelTop strong{display:block;margin-top:10px;font-size:23px;line-height:1.08;font-family:'Fredoka',system-ui,sans-serif}.mw-panelTop p{margin:8px 0 0;color:#d2cbdf;font-size:13px;line-height:1.46}.mw-taskList{display:grid;gap:1px;padding:0 8px 8px}.mw-action{min-height:68px;padding:11px 8px;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;gap:10px;align-items:center;border-radius:12px;color:#fff}.mw-action:hover{background:rgba(255,255,255,.06)}.mw-action.disabled{opacity:.48}.mw-action>span{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(0,229,255,.12);color:#00e5ff}.mw-action strong{display:block;font-size:14px}.mw-action small{display:block;margin-top:2px;color:#aaa4b8;font-size:12px;line-height:1.3}
@media (max-width:1100px){.mw-root{padding-left:0}.mw-side{display:none}.mw-shell{padding:12px 12px 34px}.mw-return{display:grid}.mw-hero{grid-template-columns:1fr}.mw-contentGrid{grid-template-columns:1fr}.mw-panel{display:block}.mw-worldGrid{grid-template-columns:repeat(3,minmax(210px,1fr));overflow:auto;padding-bottom:4px}.mw-worldCard{min-width:210px}.mw-walletPill{min-width:104px}}
@media (max-width:720px){.mw-shell{padding:8px 10px 28px}.mw-topbar{min-height:52px;align-items:center;flex-wrap:nowrap;gap:6px}.mw-return{width:38px;height:38px;border-radius:11px;flex:0 0 auto}.mw-player{height:46px;min-width:0;flex:1;grid-template-columns:34px minmax(0,1fr) 30px;gap:7px;padding:5px 7px;border-radius:13px}.mw-avatar{width:34px;height:34px;font-size:15px}.mw-playerText strong{font-size:13px}.mw-playerText span{display:none}.mw-level{width:28px;height:28px;font-size:12px}.mw-xpTrack{left:48px;right:42px;bottom:5px}.mw-wallet{width:auto;max-width:142px;margin-left:0;gap:5px;overflow-x:auto;scrollbar-width:none}.mw-wallet::-webkit-scrollbar{display:none}.mw-walletPill{min-width:64px;height:36px;padding:0 7px;gap:5px;font-size:12px;border-radius:11px}.mw-walletPill span{display:none}.mw-hero{min-height:0;grid-template-columns:minmax(0,1fr) 112px;gap:8px;margin-top:8px;align-items:stretch}.mw-heroCopy{padding:13px;border-radius:14px}.mw-kicker{display:none}.mw-hero h1{font-size:25px;line-height:1}.mw-hero p{display:none}.mw-heroActions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:10px}.mw-primary,.mw-secondary{height:38px;padding:0 10px;font-size:12px;justify-content:center;border-radius:11px}.mw-heroMap{min-height:0;border-radius:14px}.mw-routeLine,.mw-mapStats{display:none}.mw-currentPin{left:48%;bottom:32%}.mw-currentPin img{width:54px;height:54px}.mw-currentPin span{font-size:10px;padding:4px 7px}.mw-summary{display:flex;grid-template-columns:none;overflow-x:auto;gap:8px;margin-top:8px;padding-bottom:2px;scrollbar-width:none}.mw-summary::-webkit-scrollbar{display:none}.mw-summaryCard{flex:0 0 174px;min-height:76px;padding:11px;border-radius:13px}.mw-summaryCard p{display:none}.mw-summaryCard strong{font-size:16px}.mw-contentGrid{gap:10px;margin-top:10px}.mw-contentGrid>*{min-width:0}.mw-worlds,.mw-panel{width:100%;min-width:0}.mw-sectionHead{align-items:flex-start;flex-direction:column;gap:4px;margin-bottom:8px}.mw-sectionHead h2{font-size:21px}.mw-sectionHead p{display:none}.mw-worldGrid{display:flex;grid-template-columns:none;overflow-x:auto;gap:10px;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px;max-width:100%}.mw-worldGrid::-webkit-scrollbar{display:none}.mw-worldCard{flex:0 0 min(78vw,268px);min-width:0;min-height:226px;scroll-snap-align:start;padding:13px;border-radius:14px}.mw-worldArt{width:56px;height:56px}.mw-worldArt span{font-size:25px}.mw-worldCard h3{font-size:22px}.mw-worldCard p{display:none}.mw-worldStats{margin-top:10px}.mw-worldCta{min-height:34px;font-size:12px}.mw-panelTop{padding:13px}.mw-panelTop strong{font-size:20px}.mw-panelTop p{display:none}.mw-taskList{display:flex;overflow-x:auto;gap:8px;padding:0 10px 10px;scrollbar-width:none;max-width:100%}.mw-taskList::-webkit-scrollbar{display:none}.mw-action{flex:0 0 228px;min-height:58px;padding:9px;grid-template-columns:34px minmax(0,1fr) 16px}.mw-action>span{width:34px;height:34px}.mw-action strong{font-size:13px}.mw-action small{font-size:11px}.mw-backdrop img{width:110vw;height:70vh;right:-34%;bottom:10%;opacity:.12}}
@media (prefers-reduced-motion:reduce){.mw-worldCard,.mw-primary,.mw-secondary{transition:none}.mw-worldCard.playable:hover{transform:none}}
`;
