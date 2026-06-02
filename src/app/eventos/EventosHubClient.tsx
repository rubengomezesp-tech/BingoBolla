"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Gift,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { trackGameplayEvent } from "@/lib/telemetry/client";

export type EventosDailyStatus = {
  available: boolean;
  secondsLeft: number;
};

type EventTone = "pink" | "gold" | "cyan" | "green" | "violet";
type EventTab = "today" | "rewards" | "competition" | "control";

type EventAction = {
  accent: string;
  body: string;
  href: string;
  icon: LucideIcon;
  label: string;
  status: string;
  title: string;
  tone: EventTone;
};

const TAB_META: Array<{ icon: LucideIcon; key: EventTab; label: string }> = [
  { key: "today", label: "Hoy", icon: CalendarDays },
  { key: "rewards", label: "Premios", icon: Gift },
  { key: "competition", label: "Competir", icon: Trophy },
  { key: "control", label: "Control", icon: ShieldCheck },
];

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

export default function EventosHubClient({ daily }: { daily: EventosDailyStatus }) {
  const prefersReducedMotion = useReducedMotion();
  const [tab, setTab] = useState<EventTab>(daily.available ? "rewards" : "today");

  const actions = useMemo<EventAction[]>(() => {
    const dailyStatus = daily.available ? "Disponible" : `Cooldown ${formatDuration(daily.secondsLeft)}`;

    return [
      {
        href: "/regalo",
        icon: Gift,
        label: "Diario",
        title: daily.available ? "Regalo listo" : "Regalo reclamado",
        body: daily.available ? "Abre el bonus del día antes de jugar." : "El siguiente cofre se activa pronto.",
        status: dailyStatus,
        tone: daily.available ? "gold" : "violet",
        accent: "#ffd93d",
      },
      {
        href: "/ruleta",
        icon: Sparkles,
        label: "Ruleta",
        title: "Giro diario",
        body: "Monedas, SC y Diamonds en una acción rápida.",
        status: "1 tirada",
        tone: "pink",
        accent: "#ff3d7f",
      },
      {
        href: "/bolla-master",
        icon: Crown,
        label: "Builder",
        title: "Bolla Master",
        body: "Gira, protege y mejora distritos con energía.",
        status: "Nuevo modo",
        tone: "green",
        accent: "#00e676",
      },
      {
        href: "/cofres",
        icon: Trophy,
        label: "Cofres",
        title: "Premios vivos",
        body: "Cofres, VIP y recompensas agrupadas.",
        status: "Bonus",
        tone: "cyan",
        accent: "#00e5ff",
      },
      {
        href: "/mundos",
        icon: Target,
        label: "Mapa",
        title: "Mundos",
        body: "Avanza nodos, estrellas y juegos cortos.",
        status: "Progreso",
        tone: "violet",
        accent: "#b388ff",
      },
      {
        href: "/ranking",
        icon: Star,
        label: "Liga",
        title: "Ranking",
        body: "Comprueba posición y retos de comunidad.",
        status: "Social",
        tone: "gold",
        accent: "#ffd93d",
      },
    ];
  }, [daily.available, daily.secondsLeft]);

  const recommended = actions[daily.available ? 0 : 2];
  const RecommendedIcon = recommended.icon;

  function trackEventOpen(action: EventAction, source: "recommended" | "rail" | "recharge") {
    trackGameplayEvent({
      eventName: source === "recommended" ? "events.recommended_open" : "events.action_open",
      surface: "eventos",
      metadata: {
        href: action.href,
        label: action.label,
        source,
        status: action.status,
        title: action.title,
      },
    });
  }

  return (
    <div className="events-hub">
      <style>{EVENTOS_HUB_CSS}</style>

      <section className={`eh-command tone-${recommended.tone}`} aria-label="Siguiente acción recomendada">
        <div className="eh-commandCopy">
          <span className="eh-liveChip">
            <Zap size={15} aria-hidden="true" />
            Mejor siguiente acción
          </span>
          <h2>{recommended.title}</h2>
          <p>{recommended.body}</p>
        </div>
        <Link className="eh-commandCta" href={recommended.href} onClick={() => trackEventOpen(recommended, "recommended")}>
          <RecommendedIcon size={21} aria-hidden="true" />
          Abrir ahora
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      </section>

      <section className="eh-railSection" aria-labelledby="event-actions-title">
        <div className="eh-sectionHead">
          <div>
            <span>Accesos rápidos</span>
            <h2 id="event-actions-title">Desliza eventos</h2>
          </div>
          <Link
            className="eh-subtleLink"
            href="/store"
            onClick={() =>
              trackEventOpen(
                {
                  accent: "#ffd93d",
                  body: "Recarga desde eventos",
                  href: "/store",
                  icon: Ticket,
                  label: "Recarga",
                  status: "Store",
                  title: "Recargar",
                  tone: "gold",
                },
                "recharge",
              )
            }
          >
            Recargar
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="eh-actionRail" role="list" aria-label="Eventos disponibles">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`eh-actionTile tone-${action.tone}`}
                role="listitem"
                onClick={() => trackEventOpen(action, "rail")}
              >
                <span className="eh-actionIcon" style={{ "--tile-accent": action.accent } as CSSProperties}>
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span className="eh-actionLabel">{action.label}</span>
                <strong>{action.title}</strong>
                <small>{action.status}</small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="eh-menu" aria-label="Menu de eventos">
        <div className="eh-tabs" role="tablist" aria-label="Secciones de eventos">
          {TAB_META.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                className={active ? "active" : ""}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(item.key);
                  trackGameplayEvent({
                    eventName: "events.tab_select",
                    surface: "eventos",
                    metadata: {
                      active,
                      tab: item.key,
                    },
                  });
                }}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="eh-panel"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(8px)" }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.22, ease: "easeOut" }}
          >
            {tab === "today" && (
              <>
                <PanelHeading icon={Clock3} title="Agenda jugable" text="Orden claro para entrar, reclamar y volver al mapa sin perderte." />
                <div className="eh-panelGrid">
                  <PanelLink href="/regalo" icon={Gift} title="Primero el bonus" text={daily.available ? "Disponible para reclamar." : `Vuelve en ${formatDuration(daily.secondsLeft)}.`} value={daily.available ? "Listo" : "Espera"} />
                  <PanelLink href="/ruleta" icon={Sparkles} title="Después ruleta" text="Una acción corta antes de entrar a salas." value="Diario" />
                  <PanelLink href="/lobby" icon={Play} title="Entrar al lobby" text="Salas, filtros y cartones en una pantalla compacta." value="Jugar" />
                </div>
              </>
            )}

            {tab === "rewards" && (
              <>
                <PanelHeading icon={Gift} title="Premios y economía" text="Premios separados por tipo para que cada CTA tenga destino exacto." />
                <div className="eh-panelGrid">
                  <PanelLink href="/cofres" icon={Trophy} title="Cofres" text="Diario, especial y VIP." value="Abrir" />
                  <PanelLink href="/vip" icon={Crown} title="VIP" text="Estado, ventajas y recompensas premium." value="Ver" />
                  <PanelLink href="/store" icon={Ticket} title="Tienda" text="Gold Coins y recargas para continuar." value="Comprar" />
                </div>
              </>
            )}

            {tab === "competition" && (
              <>
                <PanelHeading icon={Trophy} title="Comunidad y progreso" text="El loop competitivo queda conectado a mundos, ranking y Bolla Master." />
                <div className="eh-panelGrid">
                  <PanelLink href="/mundos" icon={Target} title="Mundos" text="Nodos, estrellas y juegos cortos." value="Mapa" />
                  <PanelLink href="/ranking" icon={Star} title="Ranking" text="Posición social y metas de temporada." value="Liga" />
                  <PanelLink href="/bolla-master" icon={Crown} title="Bolla Master" text="Loop tipo builder con energía y mejoras." value="Nuevo" />
                </div>
              </>
            )}

            {tab === "control" && (
              <>
                <PanelHeading icon={ShieldCheck} title="Juego serio" text="Accesos visibles para limites, cuenta y reglas responsables." />
                <div className="eh-panelGrid">
                  <PanelLink href="/account/limits" icon={ShieldCheck} title="Limites" text="Configura presupuesto y ritmo." value="Seguro" />
                  <PanelLink href="/account" icon={CheckCircle2} title="Cuenta" text="KYC, saldo y estado de jugador." value="Perfil" />
                  <PanelLink href="/auto-exclusion" icon={Clock3} title="Pausa" text="Herramienta responsable de autoexclusión." value="18+" />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function PanelHeading({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="eh-panelHead">
      <span>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function PanelLink({
  href,
  icon: Icon,
  text,
  title,
  value,
}: {
  href: string;
  icon: LucideIcon;
  text: string;
  title: string;
  value: string;
}) {
  return (
    <Link className="eh-panelLink" href={href}>
      <span className="eh-panelIcon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="eh-panelText">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <span className="eh-panelValue">{value}</span>
    </Link>
  );
}

const EVENTOS_HUB_CSS = `
.events-hub {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}

.events-hub > * {
  min-width: 0;
  max-width: 100%;
}

.eh-command,
.eh-railSection,
.eh-menu {
  border: 1px solid rgba(255, 255, 255, .1);
  background: rgba(7, 3, 20, .72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}

.eh-command {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
  border-radius: 20px;
  padding: 18px;
}

.eh-command::before {
  content: "";
  position: absolute;
  inset: -80px 48% -80px -120px;
  background: radial-gradient(circle, color-mix(in srgb, var(--eh-tone, #ff3d7f) 48%, transparent), transparent 65%);
  opacity: .8;
  pointer-events: none;
}

.eh-command.tone-pink { --eh-tone: #ff3d7f; }
.eh-command.tone-gold { --eh-tone: #ffd93d; }
.eh-command.tone-cyan { --eh-tone: #00e5ff; }
.eh-command.tone-green { --eh-tone: #00e676; }
.eh-command.tone-violet { --eh-tone: #b388ff; }

.eh-commandCopy {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.eh-liveChip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.26);
  padding: 6px 10px;
  color: rgba(255,255,255,.72);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.eh-command h2 {
  margin-top: 10px;
  color: #fff;
  font-size: clamp(1.55rem, 5vw, 2.55rem);
  font-weight: 950;
  line-height: .95;
  text-wrap: balance;
}

.eh-command p {
  margin-top: 8px;
  max-width: 56ch;
  color: rgba(255,255,255,.72);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.eh-commandCta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff3d7f, #ffd93d);
  color: #160514;
  padding: 0 18px;
  font-weight: 950;
  touch-action: manipulation;
  transition: transform .18s ease, filter .18s ease;
}

.eh-commandCta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.eh-railSection,
.eh-menu {
  border-radius: 20px;
  padding: 14px;
}

.eh-sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  margin-bottom: 12px;
}

.eh-sectionHead span {
  color: rgba(255,255,255,.52);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.eh-sectionHead h2 {
  color: #fff;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.eh-subtleLink {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.05);
  padding: 0 12px;
  color: rgba(255,255,255,.76);
  font-size: 13px;
  font-weight: 900;
}

.eh-actionRail {
  display: flex;
  gap: 12px;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 2px 2px 6px;
  scroll-padding-inline: 2px;
  scroll-snap-type: x proximity;
  touch-action: pan-x;
}

.eh-actionTile {
  position: relative;
  display: grid;
  flex: 0 0 168px;
  min-height: 136px;
  align-content: start;
  gap: 8px;
  overflow: hidden;
  scroll-snap-align: start;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.11);
  background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
  padding: 13px;
  color: #fff;
  touch-action: manipulation;
  transition: border-color .18s ease, transform .18s ease;
}

.eh-actionTile::after {
  content: "";
  position: absolute;
  inset: auto -30px -42px 38%;
  height: 90px;
  background: radial-gradient(circle, color-mix(in srgb, var(--tile-accent, #ff3d7f) 38%, transparent), transparent 70%);
  pointer-events: none;
}

.eh-actionTile:hover {
  border-color: color-mix(in srgb, var(--tile-accent, #ff3d7f) 58%, transparent);
  transform: translateY(-2px);
}

.eh-actionIcon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--tile-accent, #ff3d7f) 17%, transparent);
  color: var(--tile-accent, #ff3d7f);
}

.eh-actionLabel {
  color: var(--tile-accent, #ff3d7f);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.eh-actionTile strong {
  font-size: 18px;
  font-weight: 950;
  line-height: 1.05;
}

.eh-actionTile small {
  color: rgba(255,255,255,.62);
  font-size: 12px;
  font-weight: 800;
}

.eh-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.eh-tabs button {
  display: inline-flex;
  min-height: 44px;
  shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.66);
  padding: 0 13px;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  touch-action: manipulation;
}

.eh-tabs button.active {
  border-color: rgba(255,61,127,.58);
  background: rgba(255,61,127,.18);
  color: #fff;
}

.eh-panel {
  min-height: 258px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.24);
  padding: 14px;
}

.eh-panelHead {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.eh-panelHead > span {
  display: grid;
  width: 42px;
  height: 42px;
  shrink: 0;
  place-items: center;
  border-radius: 14px;
  background: rgba(255,61,127,.16);
  color: #ff7dab;
}

.eh-panelHead h2 {
  color: #fff;
  font-size: 22px;
  font-weight: 950;
  line-height: 1.05;
}

.eh-panelHead p {
  margin-top: 5px;
  max-width: 62ch;
  color: rgba(255,255,255,.64);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.eh-panelGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.eh-panelLink {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 8px 10px;
  min-height: 116px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(255,255,255,.045);
  padding: 12px;
  color: #fff;
  touch-action: manipulation;
}

.eh-panelIcon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  background: rgba(255,255,255,.08);
  color: #ffd93d;
}

.eh-panelText {
  min-width: 0;
}

.eh-panelText strong {
  display: block;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.1;
}

.eh-panelText small {
  display: block;
  margin-top: 5px;
  color: rgba(255,255,255,.58);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
}

.eh-panelValue {
  grid-column: 1 / -1;
  align-self: end;
  width: fit-content;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  padding: 6px 10px;
  color: rgba(255,255,255,.78);
  font-size: 11px;
  font-weight: 950;
}

@media (max-width: 640px) {
  .events-hub {
    gap: 10px;
  }

  .eh-command {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    border-radius: 16px;
    padding: 12px;
  }

  .eh-liveChip {
    min-height: 28px;
    padding: 5px 8px;
    font-size: 10px;
    letter-spacing: 0;
    text-transform: none;
  }

  .eh-command h2 {
    margin-top: 7px;
    font-size: 20px;
    line-height: 1.02;
  }

  .eh-command p {
    display: none;
  }

  .eh-commandCta {
    justify-self: end;
    min-height: 44px;
    border-radius: 14px;
    padding: 0 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  .eh-sectionHead h2,
  .eh-panelHead h2 {
    font-size: 20px;
  }

  .eh-actionTile {
    flex-basis: 152px;
    min-height: 128px;
  }

  .eh-panel {
    min-height: 0;
    padding: 12px;
  }

  .eh-panelGrid {
    display: flex;
    gap: 10px;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .eh-panelGrid::-webkit-scrollbar {
    display: none;
  }

  .eh-panelLink {
    flex: 0 0 min(78vw, 260px);
    min-height: 94px;
    scroll-snap-align: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eh-commandCta,
  .eh-actionTile {
    transition: none;
  }

  .eh-commandCta:hover,
  .eh-actionTile:hover {
    transform: none;
  }
}
`;
