"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Crown,
  Gem,
  Gift,
  Loader2,
  LockKeyhole,
  Map,
  Menu,
  Play,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import MobileTabBar from "@/components/MobileTabBar";
import XpBar from "@/components/XpBar";
import { createClient } from "@/lib/supabase/client";

type RoomLite = {
  id: string;
  name: string;
  variant: string;
  current_game_id?: string | null;
  ticket_gold: number;
  ticket_sweeps: number;
  max_cards_per_player?: number | null;
  players_in_play: number | null;
  effective_pot_sweeps: number | null;
  effective_pot_gold?: number | null;
  game_status?: string | null;
  current_game_starts_at?: string | null;
  cards_in_play?: number | null;
  rtp?: number | null;
  rollover_gold?: number | null;
  rollover_sweeps?: number | null;
  jackpot_max_balls?: number | null;
  schedule_interval_seconds?: number | null;
};

type Stats = {
  games_played: number;
  total_wins: number;
  current_streak: number;
  total_sweeps_won: number;
};

type Filter = "all" | "live" | "sweeps" | "low";
type MenuView = "bonus" | "progress" | "missions" | "control";
type Tone = "pink" | "gold" | "cyan" | "green" | "violet";

type Toast = {
  detail: string;
  icon: ReactNode;
  title: string;
  tone: Tone;
};

type RoomPhase = {
  label: string;
  tone: Tone;
  urgent: boolean;
};

const formatInt = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

const formatSweeps = (value: number | null | undefined) =>
  `$${Number(value ?? 0).toFixed(2)}`;

const formatWalletNumber = (value: number | null | undefined, decimals = 0) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount >= 100000 ? 1 : decimals,
    minimumFractionDigits: amount >= 100000 ? 0 : decimals,
    notation: amount >= 100000 ? "compact" : "standard",
  }).format(amount);
};

const roomTones: Tone[] = ["pink", "cyan", "gold", "green", "violet"];

const roomLabels: Record<string, string> = {
  bingo75: "Bingo 75",
  bingo90: "Bingo 90",
  lite: "Speed",
  cinco: "Cinco",
  pulse: "Pulse",
};

export default function HomeScreen({
  username,
  gold,
  sweeps,
  state,
  stateExcluded,
  rooms,
  stats,
}: {
  username: string;
  gold: number;
  sweeps: number;
  state: string | null;
  stateExcluded: boolean;
  rooms: RoomLite[];
  stats: Stats | null;
}) {
  const router = useRouter();
  const refreshTimerRef = useRef<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [bonusState, setBonusState] = useState<"idle" | "loading" | "claimed" | "error">("idle");
  const [menuView, setMenuView] = useState<MenuView>("bonus");
  const [lastSync, setLastSync] = useState("En vivo");
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const normalizedRooms = useMemo(() => {
    return rooms
      .map((room, index) => {
        const phase = getRoomPhase(room, nowMs);
        return {
          ...room,
          phase,
          tone: phase.urgent ? "green" as Tone : roomTones[index % roomTones.length],
          players: Number(room.players_in_play ?? 0),
          pot: Number(room.effective_pot_sweeps ?? 0),
          potGold: Number(room.effective_pot_gold ?? 0),
          cards: Number(room.cards_in_play ?? 0),
          rtpValue: Number(room.rtp ?? 0.85),
        };
      })
      .sort((a, b) => {
        if (a.phase.urgent !== b.phase.urgent) return a.phase.urgent ? -1 : 1;
        return Number(a.ticket_sweeps ?? 0) - Number(b.ticket_sweeps ?? 0);
      });
  }, [rooms, nowMs]);

  const filteredRooms = useMemo(() => {
    if (filter === "live") return normalizedRooms.filter((room) => room.game_status === "playing");
    if (filter === "sweeps") return normalizedRooms.filter((room) => Number(room.ticket_sweeps ?? 0) > 0);
    if (filter === "low") return normalizedRooms.filter((room) => Number(room.ticket_gold ?? 0) <= 100);
    return normalizedRooms;
  }, [filter, normalizedRooms]);

  const featuredRoom = normalizedRooms[0] ?? null;
  const totalPlayers = normalizedRooms.reduce((sum, room) => sum + room.players, 0);
  const totalPot = normalizedRooms.reduce((sum, room) => sum + room.pot, 0);
  const totalGoldPot = normalizedRooms.reduce((sum, room) => sum + room.potGold, 0);
  const activeRooms = normalizedRooms.filter((room) => room.game_status === "playing").length;
  const streak = Number(stats?.current_streak ?? 0);
  const gamesPlayed = Number(stats?.games_played ?? 0);
  const wins = Number(stats?.total_wins ?? 0);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    function scheduleRefresh() {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        setLastSync(formatSyncTime());
        router.refresh();
      }, 450);
    }

    const channel = supabase
      .channel("lobby-live-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "claims" }, scheduleRefresh)
      .subscribe();

    const interval = window.setInterval(scheduleRefresh, 30000);
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  function showToast(nextToast: Toast) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function claimDailyBonus() {
    if (bonusState === "loading") return;

    setBonusState("loading");
    const response = await fetch("/api/rewards/daily", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBonusState("error");
      showToast({
        icon: <Bell size={22} aria-hidden="true" />,
        title: "Bonus no disponible",
        detail: "Vuelve a intentarlo en un momento.",
        tone: "pink",
      });
      return;
    }

    const reward = (payload?.data ?? {}) as Record<string, unknown>;
    if (reward.error) {
      setBonusState("error");
      showToast({
        icon: <Bell size={22} aria-hidden="true" />,
        title: "Bonus no disponible",
        detail: "Ese cofre ya fue reclamado o esta esperando cooldown.",
        tone: "pink",
      });
      return;
    }
    const goldAwarded = Number(reward.gold_awarded ?? reward.gold ?? 500);
    const sweepsAwarded = Number(reward.sweeps_awarded ?? reward.sweeps ?? 0.5);

    setBonusState("claimed");
    showToast({
      icon: <Gift size={22} aria-hidden="true" />,
      title: "Cofre diario reclamado",
      detail: `+${formatInt(goldAwarded)} Gold, +${sweepsAwarded.toFixed(2)} SC`,
      tone: "gold",
    });
    window.setTimeout(() => router.refresh(), 1100);
  }

  function enterRoom(roomId?: string) {
    if (!roomId) return;
    router.push(`/room/${roomId}`);
  }

  return (
    <div className="lobby-pro">
      <style>{LOBBY_CSS}</style>

      <header className="lp-topbar">
        <BrandLogo href="/lobby" size={50} />
        <div className="lp-topTitle">
          <span>Lobby</span>
          <strong>Hola, {username || "Jugador"}</strong>
        </div>
        <div className="lp-wallet" aria-label="Saldos">
          <WalletPill icon={Coins} label="Gold" value={formatWalletNumber(gold)} onClick={() => router.push("/store")} />
          <WalletPill icon={Gem} label="Sweeps" value={formatWalletNumber(sweeps, 2)} onClick={() => router.push("/store")} />
        </div>
        <button className="lp-iconButton" type="button" onClick={() => router.push("/account")} aria-label="Abrir cuenta">
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      <main className="lp-shell">
        <section className="lp-hero" aria-labelledby="lobby-title">
          <div className="lp-heroMain">
            <div className="lp-statusLine">
              <StatusChip icon={UsersRound} label={`${formatInt(totalPlayers)} jugando`} tone="green" />
              <StatusChip icon={Zap} label={`${formatInt(activeRooms)} live`} tone={activeRooms > 0 ? "green" : "violet"} />
              <StatusChip icon={Clock3} label={lastSync} tone="gold" />
              <StatusChip icon={ShieldCheck} label={stateExcluded ? `${state} solo Gold` : "Sweepstakes activo"} tone={stateExcluded ? "gold" : "cyan"} />
            </div>

            <h1 id="lobby-title">Lobby de salas</h1>
            <p>
              Todo lo importante a mano: salas, mundos, bonus, progreso y control en una interfaz rápida.
            </p>

            <div className="lp-liveBoard" aria-label="Resumen del lobby">
              <MetricCard icon={Gem} label="Pozo Sweeps" value={formatSweeps(totalPot)} tone="pink" />
              <MetricCard icon={Coins} label="Pozo Gold" value={formatInt(totalGoldPot)} tone="gold" />
              <MetricCard icon={Ticket} label="Salas abiertas" value={formatInt(normalizedRooms.length)} tone="cyan" />
            </div>

            <div className="lp-heroActions">
              <button className="lp-primary" type="button" onClick={() => enterRoom(featuredRoom?.id)} disabled={!featuredRoom}>
                <Play size={20} aria-hidden="true" />
                Entrar en recomendada
              </button>
              <button className="lp-secondary" type="button" onClick={() => router.push("/mundos")}>
                <Map size={20} aria-hidden="true" />
                Continuar mundo
              </button>
            </div>

            <div className="lp-xpPanel">
              <XpBar
                onToast={(icon, msg, detail) =>
                  showToast({
                    icon: <Sparkles size={22} aria-hidden="true" />,
                    title: `${icon} ${msg}`,
                    detail,
                    tone: "violet",
                  })
                }
              />
            </div>
          </div>

          <aside className="lp-roomPreview" aria-label="Sala recomendada">
            <span className="lp-previewLabel">Recomendado ahora</span>
            {featuredRoom ? (
              <>
                <div className={`lp-previewOrb tone-${featuredRoom.tone}`}>
                  <Ticket size={38} aria-hidden="true" />
                </div>
                <h2>{featuredRoom.name}</h2>
                <div className={`lp-previewPhase tone-${featuredRoom.phase.tone}`}>
                  <Clock3 size={15} aria-hidden="true" />
                  {featuredRoom.phase.label}
                </div>
                <dl className="lp-previewStats">
                  <div>
                    <dt>Pozo SC</dt>
                    <dd>{formatSweeps(featuredRoom.pot)}</dd>
                  </div>
                  <div>
                    <dt>Cartones</dt>
                    <dd>{formatInt(featuredRoom.cards)}</dd>
                  </div>
                  <div>
                    <dt>RTP</dt>
                    <dd>{Math.round(featuredRoom.rtpValue * 100)}%</dd>
                  </div>
                </dl>
                <button className="lp-previewButton" type="button" onClick={() => enterRoom(featuredRoom.id)}>
                  Jugar {roomLabels[featuredRoom.variant] ?? "Bingo"}
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="lp-emptyPreview">
                <Clock3 size={28} aria-hidden="true" />
                <p>No hay salas activas ahora.</p>
              </div>
            )}
          </aside>
        </section>

        <section className="lp-actionGrid" aria-label="Accesos rápidos">
          <ActionTile icon={Map} title="Mundos" body="Miami Nights y nodos" tone="cyan" onClick={() => router.push("/mundos")} />
          <ActionTile icon={Sparkles} title="Bolla Master" body="Gira y construye" tone="green" onClick={() => router.push("/bolla-master")} />
          <ActionTile icon={Gift} title="Cofres" body="Bonus y rachas" tone="gold" onClick={() => router.push("/cofres")} />
          <ActionTile icon={Crown} title="VIP" body="Ventajas y estado" tone="violet" onClick={() => router.push("/vip")} />
          <ActionTile icon={ShoppingCart} title="Tienda" body="Gold Coins" tone="pink" onClick={() => router.push("/store")} />
        </section>

        {stateExcluded && (
          <section className="lp-warning" role="status">
            <LockKeyhole size={20} aria-hidden="true" />
            <div>
              <strong>Modo Gold Coins activo en {state}</strong>
              <span>Las salas con Sweeps Coins pueden estar limitadas por tu estado.</span>
            </div>
          </section>
        )}

        <section className="lp-layout">
          <div className="lp-mainColumn">
            <div className="lp-sectionHead">
              <div>
                <span>Salas en vivo</span>
                <h2>Desliza y entra</h2>
              </div>
              <div className="lp-filters" role="tablist" aria-label="Filtrar salas">
                <FilterButton active={filter === "all"} label="Todas" onClick={() => setFilter("all")} />
                <FilterButton active={filter === "live"} label="Live" onClick={() => setFilter("live")} />
                <FilterButton active={filter === "sweeps"} label="Sweeps" onClick={() => setFilter("sweeps")} />
                <FilterButton active={filter === "low"} label="Bajo ticket" onClick={() => setFilter("low")} />
              </div>
            </div>

            <div className="lp-roomRail" role="list" aria-label="Salas disponibles">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <RoomPanel key={room.id} room={room} stateExcluded={stateExcluded} onEnter={() => enterRoom(room.id)} />
                ))
              ) : (
                <div className="lp-emptyState">
                  <Clock3 size={26} aria-hidden="true" />
                  <strong>No hay salas con este filtro</strong>
                  <span>Prueba otra categoría o vuelve al lobby completo.</span>
                </div>
              )}
            </div>
          </div>

          <aside className="lp-menuColumn" aria-label="Menú del lobby">
            <div className="lp-menuTabs" role="tablist" aria-label="Secciones del lobby">
              <MenuTab active={menuView === "bonus"} icon={Gift} label="Bonus" onClick={() => setMenuView("bonus")} />
              <MenuTab active={menuView === "progress"} icon={Trophy} label="Progreso" onClick={() => setMenuView("progress")} />
              <MenuTab active={menuView === "missions"} icon={Star} label="Misiones" onClick={() => setMenuView("missions")} />
              <MenuTab active={menuView === "control"} icon={ShieldCheck} label="Control" onClick={() => setMenuView("control")} />
            </div>

            <section className={`lp-panel lp-menuPanel view-${menuView}`}>
              {menuView === "bonus" && (
                <>
                  <div className="lp-panelHead">
                    <span>Cofre diario</span>
                    {bonusState === "claimed" ? <CheckCircle2 size={19} aria-hidden="true" /> : <Gift size={19} aria-hidden="true" />}
                  </div>
                  <p>Reclama Gold y Sweeps de bienvenida del día.</p>
                  <button className="lp-primary full" type="button" onClick={claimDailyBonus} disabled={bonusState === "loading" || bonusState === "claimed"}>
                    {bonusState === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Gift size={18} aria-hidden="true" />}
                    {bonusState === "claimed" ? "Reclamado" : "Reclamar bonus"}
                  </button>
                </>
              )}

              {menuView === "progress" && (
                <>
                  <div className="lp-panelHead">
                    <span>Progreso</span>
                    <Trophy size={19} aria-hidden="true" />
                  </div>
                  <div className="lp-statsGrid">
                    <StatBlock label="Partidas" value={formatInt(gamesPlayed)} />
                    <StatBlock label="Victorias" value={formatInt(wins)} />
                    <StatBlock label="Racha" value={`${formatInt(streak)}d`} />
                    <StatBlock label="Ganado SC" value={formatSweeps(Number(stats?.total_sweeps_won ?? 0))} />
                  </div>
                </>
              )}

              {menuView === "missions" && (
                <>
                  <div className="lp-panelHead">
                    <span>Misiones</span>
                    <Star size={19} aria-hidden="true" />
                  </div>
                  <MissionRow icon={Play} title="Juega 3 partidas" now={Math.min(gamesPlayed, 3)} max={3} />
                  <MissionRow icon={Trophy} title="Gana 2 bingos" now={Math.min(wins, 2)} max={2} />
                  <MissionRow icon={Zap} title="Mantén la racha" now={streak > 0 ? 1 : 0} max={1} />
                </>
              )}

              {menuView === "control" && (
                <>
                  <div className="lp-panelHead">
                    <span>Control</span>
                    <ShieldCheck size={19} aria-hidden="true" />
                  </div>
                  <p>18+, no purchase necessary y límites disponibles desde tu cuenta.</p>
                  <button className="lp-secondary full" type="button" onClick={() => router.push("/account/limits")}>
                    Configurar límites
                  </button>
                </>
              )}
            </section>
          </aside>
        </section>
      </main>

      <MobileTabBar activeKey="lobby" mobileOnly />

      {toast && (
        <div className={`lp-toast tone-${toast.tone}`} role="status" aria-live="polite">
          <span>{toast.icon}</span>
          <div>
            <strong>{toast.title}</strong>
            <small>{toast.detail}</small>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletPill({
  icon: Icon,
  label,
  onClick,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button className="lp-walletPill" type="button" onClick={onClick}>
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: Tone }) {
  return (
    <span className={`lp-statusChip tone-${tone}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}

function ActionTile({
  body,
  icon: Icon,
  onClick,
  title,
  tone,
}: {
  body: string;
  icon: LucideIcon;
  onClick: () => void;
  title: string;
  tone: Tone;
}) {
  return (
    <button className={`lp-actionTile tone-${tone}`} type="button" onClick={onClick}>
      <span>
        <Icon size={22} aria-hidden="true" />
      </span>
      <b>{title}</b>
      <small>{body}</small>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick} role="tab" aria-selected={active}>
      {label}
    </button>
  );
}

function MenuTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick} role="tab" aria-selected={active}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function RoomPanel({
  onEnter,
  room,
  stateExcluded,
}: {
  onEnter: () => void;
  room: RoomLite & { cards: number; phase: RoomPhase; players: number; pot: number; rtpValue: number; tone: Tone };
  stateExcluded: boolean;
}) {
  const label = roomLabels[room.variant] ?? room.variant ?? "Bingo";
  const isLive = room.game_status === "playing";
  const sweepLimited = stateExcluded && Number(room.ticket_sweeps ?? 0) > 0;
  const jackpotWindow = Number(room.jackpot_max_balls ?? 0);
  const maxCards = Number(room.max_cards_per_player ?? 0);

  return (
    <article className={`lp-roomPanel tone-${room.tone}`} role="listitem">
      <div className="lp-roomTop">
        <span className={isLive ? "live" : ""} aria-label={`Estado ${room.phase.label}`}>
          {room.phase.label}
        </span>
        <b>{label}</b>
      </div>
      <div className="lp-roomHeroLine">
        <div className="lp-roomArt" aria-hidden="true">
          <Ticket size={28} />
          <span>{room.name.slice(0, 1).toUpperCase()}</span>
        </div>
        <div>
          <h3>{room.name}</h3>
          <p>
            RTP {Math.round(room.rtpValue * 100)}%
            {jackpotWindow > 0 ? ` · jackpot ${jackpotWindow} bolas` : ""}
          </p>
        </div>
      </div>
      <div className="lp-roomStatStrip" aria-label={`Datos rápidos de ${room.name}`}>
        <span aria-label={`Pozo ${formatSweeps(room.pot)}`}><Gem size={14} aria-hidden="true" />{formatSweeps(room.pot)}</span>
        <span aria-label={`${formatInt(room.players)} jugadores`}><UsersRound size={14} aria-hidden="true" />{formatInt(room.players)}</span>
        <span aria-label={`${formatInt(room.cards)} cartones`}><Ticket size={14} aria-hidden="true" />{formatInt(room.cards)}</span>
        <span aria-label={`Ticket Gold ${formatInt(room.ticket_gold)}`}><Coins size={14} aria-hidden="true" />{formatInt(room.ticket_gold)}</span>
      </div>
      {sweepLimited ? (
        <p className="lp-roomNote">Sweeps limitado por estado. Puedes revisar salas Gold.</p>
      ) : (
        <p className="lp-roomNote">
          {maxCards > 0 ? `Máx. ${maxCards} cartones` : "Sala lista"}
          {Number(room.ticket_sweeps ?? 0) > 0 ? ` · Sweeps ${formatSweeps(room.ticket_sweeps)}` : " · Gold Coins"}
        </p>
      )}
      <button className="lp-roomButton" type="button" onClick={onEnter}>
        Ver sala
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </article>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <div className={`lp-metricCard tone-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="lp-statBlock">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MissionRow({
  icon: Icon,
  max,
  now,
  title,
}: {
  icon: LucideIcon;
  max: number;
  now: number;
  title: string;
}) {
  const pct = Math.min(100, Math.round((now / Math.max(max, 1)) * 100));
  return (
    <div className="lp-missionRow">
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{now}/{max}</span>
        <i style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}

function getRoomPhase(room: RoomLite, nowMs: number | null): RoomPhase {
  if (room.game_status === "playing") {
    return { label: "Live ahora", tone: "green", urgent: true };
  }

  if (room.current_game_starts_at) {
    if (nowMs === null) return { label: "Programada", tone: "cyan", urgent: false };
    const seconds = Math.max(0, Math.round((new Date(room.current_game_starts_at).getTime() - nowMs) / 1000));
    if (seconds <= 0) return { label: "Por iniciar", tone: "gold", urgent: true };
    if (seconds < 60) return { label: `Inicia ${seconds}s`, tone: "gold", urgent: true };
    return { label: `Inicia ${Math.ceil(seconds / 60)}m`, tone: "cyan", urgent: false };
  }

  return { label: "Abierta", tone: "violet", urgent: false };
}

function formatSyncTime() {
  return `Act. ${new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
}

const LOBBY_CSS = `
.lobby-pro{
  --lp-bg:#08080c;
  --lp-panel:#13131c;
  --lp-panel-2:#191927;
  --lp-border:#29293a;
  --lp-ink:#fbfbff;
  --lp-muted:#c9c4d4;
  --lp-soft:#90899d;
  --lp-pink:#ff3d7f;
  --lp-gold:#ffd93d;
  --lp-cyan:#00e5ff;
  --lp-green:#00e676;
  --lp-violet:#b388ff;
  min-height:100dvh;
  background:
    linear-gradient(180deg,rgba(18,13,19,.98),rgba(8,8,12,.95) 38%,#08080c 100%),
    linear-gradient(135deg,rgba(255,61,127,.11),rgba(0,229,255,.055) 46%,rgba(255,217,61,.06));
  color:var(--lp-ink);
  font-family:var(--font-sans,Geist,system-ui,sans-serif);
  letter-spacing:0;
  padding-bottom:40px;
  overflow-x:hidden;
}
.lobby-pro *{box-sizing:border-box}
.lobby-pro button{font:inherit}
.lp-topbar{
  position:sticky;
  top:0;
  z-index:20;
  width:min(1180px,calc(100% - 24px));
  min-height:78px;
  margin:0 auto;
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto auto;
  align-items:center;
  gap:14px;
  background:rgba(8,8,12,.88);
  backdrop-filter:blur(14px);
}
.lp-topTitle{min-width:0}
.lp-topTitle span{display:block;color:var(--lp-soft);font-size:12px;font-weight:800}
.lp-topTitle strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:18px;font-weight:950}
.lp-wallet{min-width:0;display:flex;gap:8px;align-items:center;overflow:hidden}
.lp-walletPill,.lp-iconButton,.lp-primary,.lp-secondary,.lp-previewButton,.lp-actionTile,.lp-filters button,.lp-roomButton,.lp-menuTabs button{
  cursor:pointer;
  transition:transform .18s ease,background .18s ease,border-color .18s ease,filter .18s ease;
}
.lp-walletPill{
  min-width:0;max-width:146px;min-height:42px;
  display:grid;
  grid-template-columns:auto minmax(0,auto) minmax(0,1fr);
  align-items:center;
  gap:7px;
  border:1px solid var(--lp-border);
  border-radius:999px;
  padding:0 12px;
  background:#11111a;
  color:#fff;
}
.lp-walletPill span{min-width:0;color:var(--lp-soft);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-walletPill strong{min-width:0;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-walletPill:first-child svg{color:var(--lp-gold)}
.lp-walletPill:nth-child(2) svg{color:var(--lp-pink)}
.lp-iconButton{
  width:42px;height:42px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--lp-border);
  background:#11111a;color:#fff;
}
.lp-shell{width:min(1180px,calc(100% - 24px));margin:0 auto;padding:12px 0 36px;overflow:hidden}
.lp-hero{
  display:grid;
  grid-template-columns:minmax(0,1fr) 320px;
  gap:12px;
  align-items:stretch;
}
.lp-heroMain,.lp-roomPreview,.lp-panel,.lp-roomPanel,.lp-actionTile,.lp-warning,.lp-emptyState{
  border:1px solid var(--lp-border);
  border-radius:8px;
  background:linear-gradient(180deg,#151520,#101018);
}
.lp-heroMain{
  min-width:0;
  min-height:260px;
  padding:22px;
  position:relative;
  overflow:hidden;
}
.lp-statusLine{
  display:flex;
  gap:8px;
  margin-bottom:18px;
  overflow-x:auto;
  padding-bottom:2px;
  scrollbar-width:none;
}
.lp-statusLine::-webkit-scrollbar{display:none}
.lp-statusChip{
  flex:0 0 auto;
  min-height:31px;
  display:inline-flex;
  align-items:center;
  gap:7px;
  border-radius:999px;
  padding:0 11px;
  background:rgba(255,255,255,.06);
  color:#fff;
  font-size:12px;
  font-weight:850;
}
.tone-pink{--tone:var(--lp-pink)}
.tone-gold{--tone:var(--lp-gold)}
.tone-cyan{--tone:var(--lp-cyan)}
.tone-green{--tone:var(--lp-green)}
.tone-violet{--tone:var(--lp-violet)}
.lp-statusChip svg,.lp-panelHead svg,.lp-roomPanel svg{color:var(--tone)}
.lp-hero h1{
  position:relative;
  z-index:1;
  max-width:680px;
  margin:0;
  font-size:42px;
  line-height:1.02;
  font-weight:1000;
  letter-spacing:0;
  text-wrap:balance;
}
.lp-hero p{
  position:relative;
  z-index:1;
  max-width:560px;
  margin:10px 0 0;
  color:var(--lp-muted);
  font-size:16px;
  line-height:1.55;
  font-weight:650;
}
.lp-liveBoard{
  min-width:0;
  max-width:100%;
  position:relative;
  z-index:1;
  display:flex;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  scrollbar-width:none;
  gap:8px;
  max-width:680px;
  margin-top:16px;
  padding-bottom:2px;
}
.lp-liveBoard::-webkit-scrollbar{display:none}
.lp-metricCard{
  flex:0 0 190px;
  min-height:70px;
  scroll-snap-align:start;
  border:1px solid rgba(255,255,255,.09);
  border-radius:8px;
  background:#11111a;
  padding:12px;
  display:grid;
  grid-template-columns:auto minmax(0,1fr);
  gap:4px 8px;
  align-items:center;
}
.lp-metricCard svg{color:var(--tone)}
.lp-metricCard span{
  color:var(--lp-soft);
  font-size:11px;
  font-weight:850;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.lp-metricCard strong{
  grid-column:1/-1;
  color:#fff;
  font-size:20px;
  font-weight:1000;
  font-variant-numeric:tabular-nums;
}
.lp-heroActions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.lp-primary,.lp-secondary,.lp-previewButton,.lp-roomButton{
  min-height:48px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  border-radius:999px;
  padding:0 18px;
  font-size:14px;
  font-weight:950;
}
.lp-primary{
  border:0;
  background:linear-gradient(180deg,#fff07f 0%,var(--lp-gold) 48%,#c77700 100%);
  color:#251400;
}
.lp-secondary{
  border:1px solid var(--lp-border);
  background:#1a1a25;
  color:#fff;
}
.lp-primary.full,.lp-secondary.full{width:100%}
.lp-primary:hover,.lp-secondary:hover,.lp-previewButton:hover,.lp-roomButton:hover,.lp-actionTile:hover,.lp-walletPill:hover,.lp-iconButton:hover{
  transform:translateY(-2px);
  filter:brightness(1.05);
}
.lp-primary:focus-visible,.lp-secondary:focus-visible,.lp-previewButton:focus-visible,.lp-roomButton:focus-visible,.lp-actionTile:focus-visible,.lp-walletPill:focus-visible,.lp-iconButton:focus-visible,.lp-filters button:focus-visible,.lp-menuTabs button:focus-visible{
  outline:3px solid rgba(0,229,255,.9);
  outline-offset:3px;
}
.lp-xpPanel{position:relative;z-index:1;margin-top:16px;max-width:520px}
.lp-roomPreview{min-width:0;padding:16px;display:flex;flex-direction:column;align-items:flex-start;min-height:260px}
.lp-previewLabel{color:var(--lp-soft);font-size:12px;font-weight:900}
.lp-previewOrb{
  width:54px;height:54px;margin:14px 0 12px;display:grid;place-items:center;border-radius:8px;
  background:var(--tone);
  color:#07070d;
}
.lp-roomPreview h2{margin:0;color:#fff;font-size:24px;line-height:1.05;font-weight:1000}
.lp-previewPhase{
  min-height:30px;
  display:inline-flex;
  align-items:center;
  gap:7px;
  margin-top:10px;
  border-radius:999px;
  padding:0 10px;
  color:var(--tone);
  background:rgba(255,255,255,.06);
  font-size:12px;
  font-weight:900;
}
.lp-previewStats{width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
.lp-previewStats div,.lp-statBlock{
  min-height:56px;border-radius:8px;background:#1b1b29;padding:9px;
}
.lp-previewStats dt,.lp-statBlock span{color:var(--lp-soft);font-size:11px;font-weight:800}
.lp-previewStats dd,.lp-statBlock strong{display:block;margin:3px 0 0;color:#fff;font-size:16px;font-weight:950}
.lp-previewButton{width:100%;margin-top:auto;border:0;background:var(--tone,var(--lp-pink));color:#08080c}
.lp-emptyPreview{margin:auto;text-align:center;color:var(--lp-muted)}
.lp-actionGrid{
  min-width:0;
  max-width:100%;
  display:flex;
  gap:10px;
  margin-top:12px;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  scrollbar-width:none;
  padding-bottom:2px;
}
.lp-actionGrid::-webkit-scrollbar{display:none}
.lp-actionTile{
  flex:0 0 218px;
  min-height:86px;
  scroll-snap-align:start;
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  grid-template-rows:auto auto;
  gap:2px 12px;
  align-items:center;
  padding:15px;
  color:#fff;
  text-align:left;
}
.lp-actionTile span{
  grid-row:1/3;
  width:42px;height:42px;display:grid;place-items:center;border-radius:8px;background:var(--tone);color:#08080c;
}
.lp-actionTile b{font-size:16px;font-weight:950}
.lp-actionTile small{color:var(--lp-soft);font-size:12px;font-weight:750}
.lp-actionTile>svg{grid-row:1/3;color:var(--lp-soft)}
.lp-warning{
  margin-top:12px;
  min-height:68px;
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px;
  color:#ffe9aa;
  background:#19160f;
  border-color:rgba(255,217,61,.32);
}
.lp-warning span{display:block;margin-top:2px;color:#d8c58c;font-size:13px}
.lp-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px;margin-top:18px;align-items:start}
.lp-mainColumn,.lp-menuColumn{min-width:0}
.lp-sectionHead{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:12px}
.lp-sectionHead span,.lp-panelHead span{display:block;color:#ffe37a;font-size:12px;font-weight:950}
.lp-sectionHead h2{margin:4px 0 0;font-size:26px;line-height:1.1;font-weight:1000}
.lp-filters{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.lp-filters button{
  min-height:34px;border-radius:999px;border:1px solid var(--lp-border);background:#12121b;color:var(--lp-muted);
  padding:0 12px;font-size:12px;font-weight:850;
}
.lp-filters button.active{background:#fff;color:#09090d;border-color:#fff}
.lp-roomRail{
  min-width:0;
  max-width:100%;
  display:flex;
  gap:10px;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  scrollbar-width:none;
  padding:0 2px 6px;
}
.lp-roomRail::-webkit-scrollbar{display:none}
.lp-roomPanel{
  flex:0 0 288px;
  min-height:232px;
  padding:14px;
  scroll-snap-align:start;
}
.lp-roomTop{display:flex;justify-content:space-between;gap:10px;align-items:center}
.lp-roomTop span{
  min-height:27px;display:inline-flex;align-items:center;border-radius:999px;padding:0 9px;
  background:#20202f;color:var(--lp-muted);font-size:11px;font-weight:900;
}
.lp-roomTop span.live{background:rgba(0,230,118,.12);color:#8dffbd}
.lp-roomTop b{color:var(--tone);font-size:12px;font-weight:950}
.lp-roomHeroLine{display:grid;grid-template-columns:54px minmax(0,1fr);gap:12px;align-items:center;margin:14px 0 12px}
.lp-roomHeroLine>div:last-child{min-width:0}
.lp-roomArt{
  width:54px;height:54px;display:grid;place-items:center;position:relative;border-radius:8px;
  background:var(--tone);
  color:#08080c;
}
.lp-roomArt span{position:absolute;font-size:20px;font-weight:1000}
.lp-roomPanel h3{margin:0;font-size:19px;line-height:1.08;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-roomHeroLine p{margin:4px 0 0;color:var(--lp-soft);font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-roomStatStrip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.lp-roomStatStrip span{
  min-width:0;
  min-height:34px;
  display:flex;
  align-items:center;
  gap:6px;
  border-radius:8px;
  background:#1b1b29;
  padding:0 8px;
  color:#fff;
  font-size:12px;
  font-weight:900;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.lp-roomStatStrip svg{flex:0 0 auto;color:var(--tone)}
.lp-roomNote{min-height:18px;margin:10px 0 0;color:var(--lp-muted);font-size:12px;line-height:1.35;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-roomButton{width:100%;margin-top:12px;border:0;background:var(--tone);color:#08080c}
.lp-menuColumn{display:grid;gap:10px}
.lp-menuTabs{
  min-width:0;
  max-width:100%;
  display:flex;
  gap:7px;
  overflow-x:auto;
  scrollbar-width:none;
  padding-bottom:2px;
}
.lp-menuTabs::-webkit-scrollbar{display:none}
.lp-menuTabs button{
  flex:1 0 auto;
  min-height:42px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border:1px solid var(--lp-border);
  border-radius:999px;
  background:#12121b;
  color:var(--lp-muted);
  padding:0 11px;
  font-size:12px;
  font-weight:900;
  cursor:pointer;
}
.lp-menuTabs button.active{background:#fff;color:#09090d;border-color:#fff}
.lp-menuPanel{min-height:212px}
.lp-panel{padding:16px}
.lp-panelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.lp-panel p{margin:0 0 14px;color:var(--lp-muted);font-size:13px;line-height:1.5;font-weight:650}
.lp-daily{background:linear-gradient(180deg,#1e1920,#13131c);border-color:rgba(255,217,61,.28)}
.lp-statsGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.lp-missionRow{display:grid;grid-template-columns:24px minmax(0,1fr);gap:9px;align-items:center;margin-top:12px}
.lp-missionRow svg{color:var(--lp-gold)}
.lp-missionRow strong{display:block;color:#fff;font-size:13px}
.lp-missionRow span{display:block;margin:2px 0 6px;color:var(--lp-soft);font-size:11px;font-weight:800}
.lp-missionRow div{position:relative}
.lp-missionRow div:after{content:"";display:block;height:6px;border-radius:999px;background:#262637}
.lp-missionRow i{position:absolute;left:0;bottom:0;width:100%;height:6px;border-radius:999px;background:var(--lp-gold);transform-origin:left center}
.lp-responsible{background:#11131a}
.lp-emptyState{min-height:220px;display:grid;place-items:center;text-align:center;padding:24px;color:var(--lp-muted)}
.lp-emptyState strong{display:block;color:#fff;margin-top:8px}
.lp-toast{
  position:fixed;right:18px;top:92px;z-index:40;min-width:280px;display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;
  align-items:center;border-radius:8px;border:1px solid var(--tone);background:#11111b;padding:12px;color:#fff;
}
.lp-toast>span{width:42px;height:42px;display:grid;place-items:center;border-radius:8px;background:var(--tone);color:#08080c}
.lp-toast strong{display:block;font-size:14px}.lp-toast small{display:block;color:var(--lp-muted);font-size:12px;margin-top:2px}
.lp-primary:disabled{opacity:.58;cursor:not-allowed;transform:none;filter:none}
.lp-primary svg{flex:0 0 auto}
.lp-primary .spin{animation:lp-spin .8s linear infinite}
@keyframes lp-spin{to{transform:rotate(360deg)}}
@media(max-width:980px){
  .lp-topbar{grid-template-columns:auto minmax(0,1fr) auto;min-height:70px}
  .lp-iconButton{grid-column:3;grid-row:1}
  .lp-wallet{grid-column:1/4;grid-row:2;width:100%;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  .lp-wallet::-webkit-scrollbar{display:none}
  .lp-hero,.lp-layout{grid-template-columns:1fr}
  .lp-roomPreview{
    min-height:auto;
    display:grid;
    grid-template-columns:48px minmax(0,1fr);
    align-items:center;
    gap:8px 12px;
  }
  .lp-previewLabel{grid-column:1/-1}
  .lp-previewOrb{width:48px;height:48px;margin:0}
  .lp-roomPreview h2{min-width:0;font-size:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lp-previewPhase{margin-top:4px}
  .lp-previewStats{display:none}
  .lp-previewButton{grid-column:1/-1;min-height:44px;margin-top:6px}
  .lp-menuTabs button{flex:0 0 auto}
}
@media(max-width:620px){
  .lobby-pro{padding-bottom:96px}
  .lp-shell,.lp-topbar{width:min(100% - 20px,1180px)}
  .lp-topbar{
    min-height:58px;
    grid-template-columns:auto minmax(42px,1fr) auto auto;
    gap:6px;
  }
  .lp-topbar>a:first-child img{height:38px!important;width:auto!important}
  .lp-topTitle span{font-size:10px}
  .lp-topTitle strong{font-size:13px}
  .lp-wallet{grid-column:auto;grid-row:auto;width:auto;gap:5px;overflow:visible;padding:0}
  .lp-walletPill{
    grid-template-columns:auto minmax(0,1fr);
    flex:0 0 auto;
    max-width:78px;
    min-height:38px;
    padding:0 7px;
    gap:5px;
  }
  .lp-walletPill span{display:none}
  .lp-walletPill strong{font-size:11px}
  .lp-iconButton{grid-column:auto;grid-row:auto;width:38px;height:38px}
  .lp-shell{padding-top:8px}
  .lp-hero{gap:8px}
  .lp-heroMain{min-height:auto;padding:12px}
  .lp-statusLine{margin-bottom:10px}
  .lp-statusChip{min-height:28px;padding:0 9px;font-size:11px}
  .lp-hero h1{font-size:24px}
  .lp-hero p{display:none}
  .lp-liveBoard{margin:10px -2px 0;padding-left:2px;padding-right:2px;gap:7px}
  .lp-metricCard{flex-basis:118px;min-height:58px;padding:9px}
  .lp-metricCard span{font-size:10px}
  .lp-metricCard strong{font-size:15px}
  .lp-xpPanel{display:none}
  .lp-heroActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
  .lp-heroActions .lp-primary,.lp-heroActions .lp-secondary{
    width:auto;
    min-height:42px;
    padding:0 10px;
    font-size:12px;
  }
  .lp-roomPreview{
    min-height:auto;
    grid-template-columns:42px minmax(0,1fr);
    padding:10px 12px;
    gap:6px 10px;
  }
  .lp-previewLabel{display:none}
  .lp-previewOrb{width:42px;height:42px}
  .lp-roomPreview h2{font-size:18px}
  .lp-previewPhase{min-height:27px;font-size:11px}
  .lp-previewButton{grid-column:1/-1;min-height:38px;margin-top:2px;font-size:12px}
  .lp-actionGrid{gap:8px;margin-top:8px}
  .lp-actionTile{flex-basis:154px;min-height:72px;padding:11px;gap:2px 9px}
  .lp-actionTile span{width:34px;height:34px}
  .lp-actionTile b{font-size:13px}
  .lp-actionTile small{font-size:11px}
  .lp-layout{margin-top:12px}
  .lp-roomPanel{flex-basis:min(84vw,292px);min-height:210px}
  .lp-roomHeroLine{margin:10px 0}
  .lp-roomStatStrip{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}
  .lp-roomStatStrip::-webkit-scrollbar{display:none}
  .lp-roomStatStrip span{flex:0 0 118px}
  .lp-roomNote{margin-top:8px}
  .lp-roomButton{min-height:42px;margin-top:9px}
  .lp-sectionHead{align-items:flex-start;flex-direction:column;gap:8px;margin-bottom:8px}
  .lp-sectionHead h2{font-size:20px}
  .lp-filters{justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;max-width:100%;scrollbar-width:none}
  .lp-filters::-webkit-scrollbar{display:none}
  .lp-menuPanel{min-height:154px}
  .lp-panel{padding:13px}
  .lp-statsGrid{display:flex;overflow-x:auto;gap:8px;scrollbar-width:none}
  .lp-statsGrid::-webkit-scrollbar{display:none}
  .lp-statBlock{flex:0 0 122px}
  .lp-toast{left:10px;right:10px;top:82px;min-width:0}
}
@media(prefers-reduced-motion:reduce){
  .lobby-pro *, .lobby-pro *:before, .lobby-pro *:after{
    animation:none!important;
    transition:none!important;
  }
}
`;
