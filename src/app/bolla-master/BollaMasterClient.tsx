"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Bolt,
  Building2,
  Coins,
  Crown,
  Gem,
  Hammer,
  History,
  RotateCw,
  Shield,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import MobileTabBar from "@/components/MobileTabBar";
import { trackGameplayEvent } from "@/lib/telemetry/client";

type ProfileLite = {
  diamonds?: number | null;
  display_name?: string | null;
  gold_coins?: number | null;
  sweeps_coins?: number | null;
  username?: string | null;
};

type BuildingKey = "hotel_neon" | "muelle_dorado" | "sala_vip";
type SymbolKey = "gold" | "shield" | "raid" | "chest" | "tickets" | "gem";

type SpinSymbol = {
  color: string;
  icon: LucideIcon;
  key: SymbolKey;
  label: string;
};

type Reward = {
  diamonds?: number;
  gold?: number;
  shields?: number;
  tickets?: number;
};

type BollaMasterState = {
  building_levels: Record<BuildingKey, number>;
  daily_spin_limit: number;
  daily_spins: number;
  energy: number;
  energy_regen_seconds: number;
  max_energy: number;
  next_energy_at: string | null;
  progress_pct: number;
  shields: number;
  tickets: number;
};

type BollaMasterPayload = {
  balances: {
    diamonds: number;
    gold: number;
    sweeps: number;
  };
  ok: boolean;
  recent_spins: Array<{
    created_at?: string;
    diamonds_delta?: number;
    gold_delta?: number;
    id?: string;
    multiplier?: number;
    reels?: string[];
    shields_delta?: number;
    tickets_delta?: number;
  }>;
  recent_upgrades: Array<{
    building_key?: BuildingKey;
    gold_cost?: number;
    to_level?: number;
  }>;
  state: BollaMasterState;
};

type ActionPayload = {
  data?: unknown;
  duplicate?: boolean;
  error?: string;
  ok?: boolean;
  spin?: {
    multiplier?: number;
    reels?: string[];
    reward?: Reward;
  };
  upgrade?: {
    building_key?: BuildingKey;
    gold_cost?: number;
    to_level?: number;
  };
};

const SYMBOLS: SpinSymbol[] = [
  { key: "gold", label: "Gold", icon: Coins, color: "#ffd93d" },
  { key: "shield", label: "Escudo", icon: Shield, color: "#00e676" },
  { key: "raid", label: "Rival", icon: Swords, color: "#ff3d7f" },
  { key: "chest", label: "Cofre", icon: Crown, color: "#b388ff" },
  { key: "tickets", label: "Tickets", icon: Ticket, color: "#00e5ff" },
  { key: "gem", label: "Gemas", icon: Gem, color: "#72f5ff" },
];

const DEFAULT_LEVELS: Record<BuildingKey, number> = {
  hotel_neon: 2,
  muelle_dorado: 1,
  sala_vip: 0,
};

const DAILY_SPIN_LIMIT_FALLBACK = 30;
const REFILL_TICKET_COST = 4;

const BUILDINGS: Array<{
  baseCost: number;
  icon: LucideIcon;
  key: BuildingKey;
  name: string;
}> = [
  { key: "hotel_neon", name: "Hotel Neon", baseCost: 1800, icon: Building2 },
  { key: "muelle_dorado", name: "Muelle Dorado", baseCost: 2700, icon: Crown },
  { key: "sala_vip", name: "Sala VIP", baseCost: 3600, icon: Trophy },
];

function compact(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number(value ?? 0) >= 100000 ? 1 : 0,
    notation: Number(value ?? 0) >= 100000 ? "compact" : "standard",
  }).format(Number(value ?? 0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asDailySpinLimit(value: unknown) {
  return Math.min(DAILY_SPIN_LIMIT_FALLBACK, Math.max(1, Math.trunc(asNumber(value, DAILY_SPIN_LIMIT_FALLBACK))));
}

function asLevels(value: unknown): Record<BuildingKey, number> {
  const source = isRecord(value) ? value : {};
  return {
    hotel_neon: Math.min(5, Math.max(0, Math.trunc(asNumber(source.hotel_neon, DEFAULT_LEVELS.hotel_neon)))),
    muelle_dorado: Math.min(5, Math.max(0, Math.trunc(asNumber(source.muelle_dorado, DEFAULT_LEVELS.muelle_dorado)))),
    sala_vip: Math.min(5, Math.max(0, Math.trunc(asNumber(source.sala_vip, DEFAULT_LEVELS.sala_vip)))),
  };
}

function normalizeData(input: unknown, profile: ProfileLite): BollaMasterPayload {
  const source = isRecord(input) ? input : {};
  const rawBalances = isRecord(source.balances) ? source.balances : {};
  const rawState = isRecord(source.state) ? source.state : {};
  const buildingLevels = asLevels(rawState.building_levels);
  const totalLevels = buildingLevels.hotel_neon + buildingLevels.muelle_dorado + buildingLevels.sala_vip;

  return {
    ok: Boolean(source.ok ?? true),
    balances: {
      gold: asNumber(rawBalances.gold, Number(profile.gold_coins ?? 0)),
      sweeps: asNumber(rawBalances.sweeps, Number(profile.sweeps_coins ?? 0)),
      diamonds: asNumber(rawBalances.diamonds, Number(profile.diamonds ?? 0)),
    },
    state: {
      building_levels: buildingLevels,
      daily_spin_limit: asDailySpinLimit(rawState.daily_spin_limit),
      daily_spins: Math.trunc(asNumber(rawState.daily_spins, 0)),
      energy: Math.trunc(asNumber(rawState.energy, 5)),
      energy_regen_seconds: Math.trunc(asNumber(rawState.energy_regen_seconds, 900)),
      max_energy: Math.trunc(asNumber(rawState.max_energy, 5)),
      next_energy_at: typeof rawState.next_energy_at === "string" ? rawState.next_energy_at : null,
      progress_pct: Math.trunc(asNumber(rawState.progress_pct, Math.round((totalLevels / 15) * 100))),
      shields: Math.trunc(asNumber(rawState.shields, 2)),
      tickets: Math.trunc(asNumber(rawState.tickets, 8)),
    },
    recent_spins: Array.isArray(source.recent_spins) ? source.recent_spins.filter(isRecord) : [],
    recent_upgrades: Array.isArray(source.recent_upgrades) ? source.recent_upgrades.filter(isRecord) : [],
  };
}

function pickSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function symbolFromKey(key: string) {
  return SYMBOLS.find((symbol) => symbol.key === key) ?? SYMBOLS[0];
}

function upgradeCost(baseCost: number, level: number) {
  return baseCost * Math.max(1, level + 1);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function errorCopy(error: unknown) {
  switch (String(error ?? "")) {
    case "daily_limit_reached":
      return "Límite diario alcanzado. Vuelve mañana con la rueda cargada.";
    case "energy_full":
      return "La energía ya está llena.";
    case "insufficient_gold":
      return "Gold insuficiente para esta mejora.";
    case "max_level":
      return "Ese distrito ya está al máximo.";
    case "no_energy":
      return "Sin energía. Convierte tickets o espera la recarga.";
    case "not_enough_tickets":
      return `Necesitas ${REFILL_TICKET_COST} tickets para recargar.`;
    case "self_excluded":
    case "account_banned":
      return "Cuenta restringida para jugar.";
    default:
      return "Acción no disponible ahora mismo.";
  }
}

function rewardCopy(reward: Reward | undefined, multiplier = 1) {
  const parts = [
    Number(reward?.gold ?? 0) > 0 ? `+${compact(reward?.gold)} Gold` : "",
    Number(reward?.diamonds ?? 0) > 0 ? `+${compact(reward?.diamonds)} gemas` : "",
    Number(reward?.tickets ?? 0) > 0 ? `+${compact(reward?.tickets)} tickets` : "",
    Number(reward?.shields ?? 0) > 0 ? `+${compact(reward?.shields)} escudos` : "",
  ].filter(Boolean);

  if (parts.length === 0) return "Tirada limpia. La próxima puede encender el combo.";
  return `${multiplier > 1 ? `Combo x${multiplier}: ` : "Premio: "}${parts.join(" · ")}`;
}

function ledgerRewardCopy(spin: BollaMasterPayload["recent_spins"][number]) {
  const parts = [
    Number(spin.gold_delta ?? 0) > 0 ? `+${compact(spin.gold_delta)} Gold` : "",
    Number(spin.diamonds_delta ?? 0) > 0 ? `+${compact(spin.diamonds_delta)} gemas` : "",
    Number(spin.tickets_delta ?? 0) > 0 ? `+${compact(spin.tickets_delta)} tickets` : "",
    Number(spin.shields_delta ?? 0) > 0 ? `+${compact(spin.shields_delta)} escudos` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Sin premio";
}

function nonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function BollaMasterClient({
  initialData,
  profile,
}: {
  initialData?: unknown;
  profile: ProfileLite;
}) {
  const [data, setData] = useState(() => normalizeData(initialData, profile));
  const [reels, setReels] = useState<SpinSymbol[]>([SYMBOLS[0], SYMBOLS[1], SYMBOLS[3]]);
  const [spinning, setSpinning] = useState(false);
  const [feed, setFeed] = useState("Completa sets para cargar el cofre maestro.");
  const [combo, setCombo] = useState(0);

  const playerName = profile.display_name ?? profile.username ?? "Jugador";
  const progress = data.state.progress_pct;
  const spinsLeft = Math.max(0, data.state.daily_spin_limit - data.state.daily_spins);
  const canSpin = !spinning && data.state.energy > 0 && spinsLeft > 0;

  async function postAction(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as ActionPayload | null;

    if (payload?.data) setData(normalizeData(payload.data, profile));

    if (!response.ok) {
      throw new Error(errorCopy(payload?.error));
    }

    return payload ?? {};
  }

  async function spin() {
    if (spinning) return;
    if (spinsLeft <= 0) {
      setFeed("Límite diario alcanzado. Vuelve mañana con la rueda cargada.");
      return;
    }
    if (data.state.energy <= 0) {
      setFeed("Sin energía. Convierte tickets o espera la próxima carga.");
      return;
    }

    trackGameplayEvent({
      eventName: "bolla_master.spin_start",
      surface: "bolla_master",
      metadata: {
        daily_spins: data.state.daily_spins,
        energy: data.state.energy,
        tickets: data.state.tickets,
      },
    });

    setSpinning(true);
    setFeed("La rueda está cargando premio...");

    let timer: number | undefined = window.setInterval(() => {
      setReels([pickSymbol(), pickSymbol(), pickSymbol()]);
    }, 80);

    try {
      const [payload] = await Promise.all([
        postAction("/api/bolla-master/spin", { nonce: nonce() }),
        wait(980),
      ]);

      if (timer) window.clearInterval(timer);
      timer = undefined;

      const resultReels = Array.isArray(payload.spin?.reels) && payload.spin.reels.length === 3
        ? payload.spin.reels.map(symbolFromKey)
        : [pickSymbol(), pickSymbol(), pickSymbol()];

      setReels(resultReels);
      setCombo(Math.max(1, Math.trunc(Number(payload.spin?.multiplier ?? 1))));
      setFeed(rewardCopy(payload.spin?.reward, payload.spin?.multiplier));
      trackGameplayEvent({
        eventName: "bolla_master.spin_result",
        surface: "bolla_master",
        metadata: {
          multiplier: payload.spin?.multiplier ?? 1,
          reels: payload.spin?.reels ?? [],
          reward: payload.spin?.reward ?? {},
          status: "success",
        },
      });
    } catch (error) {
      setFeed(error instanceof Error ? error.message : "La tirada no pudo cerrarse.");
      trackGameplayEvent({
        eventName: "bolla_master.spin_result",
        surface: "bolla_master",
        metadata: {
          error: error instanceof Error ? error.message : "spin_failed",
          status: "error",
        },
      });
    } finally {
      if (timer) window.clearInterval(timer);
      setSpinning(false);
    }
  }

  async function refill() {
    try {
      trackGameplayEvent({
        eventName: "bolla_master.refill",
        surface: "bolla_master",
        metadata: {
          energy: data.state.energy,
          max_energy: data.state.max_energy,
          tickets: data.state.tickets,
        },
      });
      await postAction("/api/bolla-master/refill");
      setFeed("Energía recargada. La siguiente tirada está lista.");
    } catch (error) {
      setFeed(error instanceof Error ? error.message : "No se pudo recargar energía.");
    }
  }

  async function upgrade(buildingKey: BuildingKey) {
    try {
      const currentLevel = data.state.building_levels[buildingKey];
      const building = BUILDINGS.find((item) => item.key === buildingKey);
      trackGameplayEvent({
        eventName: "bolla_master.upgrade",
        surface: "bolla_master",
        metadata: {
          building_key: buildingKey,
          current_level: currentLevel,
          gold_cost: building ? upgradeCost(building.baseCost, currentLevel) : null,
        },
      });
      const payload = await postAction("/api/bolla-master/upgrade", { building_key: buildingKey });
      setFeed(`${building?.name ?? "Distrito"} sube a nivel ${payload.upgrade?.to_level ?? ""}.`);
    } catch (error) {
      setFeed(error instanceof Error ? error.message : "No se pudo mejorar el distrito.");
    }
  }

  return (
    <div className="bm-root">
      <header className="bm-hud">
        <Link href="/lobby" className="bm-icon" aria-label="Volver al lobby">
          <ArrowLeft size={21} aria-hidden="true" />
        </Link>
        <div className="bm-title">
          <span>Bolla Master</span>
          <strong>{playerName}</strong>
        </div>
        <div className="bm-wallet" aria-label="Saldos del modo">
          <span><Coins size={15} />{compact(data.balances.gold)}</span>
          <span><Gem size={15} />{compact(data.balances.diamonds)}</span>
        </div>
      </header>

      <main className="bm-main">
        <section className="bm-world">
          <div>
            <span className="bm-kicker">Miami raid loop</span>
            <h1>Gira, protege y construye tu mundo.</h1>
            <p>Domina la costa con combos, escudos y upgrades de distrito.</p>
          </div>
          <div className="bm-progress">
            <strong>{progress}%</strong>
            <span>Mapa cargado</span>
            <i style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        </section>

        <section className="bm-machine" aria-label="Giro maestro">
          <div className="bm-status">
            <span><Bolt size={15} /> {data.state.energy}/{data.state.max_energy}</span>
            <span><Ticket size={15} /> {data.state.tickets}</span>
            <span><Shield size={15} /> {data.state.shields}/5</span>
          </div>

          <div className="bm-reels">
            {reels.map((symbol, index) => {
              const Icon = symbol.icon;
              return (
                <motion.div
                  className="bm-reel"
                  key={`${symbol.key}-${index}-${spinning ? "spin" : "idle"}`}
                  style={{ "--tone": symbol.color } as CSSProperties}
                  animate={{ y: spinning ? [0, -8, 7, 0] : 0, scale: spinning ? [1, 1.04, 0.98, 1] : 1 }}
                  transition={{ duration: 0.32, repeat: spinning ? Infinity : 0 }}
                >
                  <Icon size={34} strokeWidth={2.4} aria-hidden="true" />
                  <span>{symbol.label}</span>
                </motion.div>
              );
            })}
          </div>

          <button className="bm-spin" type="button" onClick={spin} disabled={!canSpin}>
            {spinning ? <RotateCw className="bm-spinIcon" size={24} /> : <Sparkles size={24} />}
            {spinning ? "Girando" : spinsLeft <= 0 ? "Límite diario" : data.state.energy > 0 ? "Girar" : "Sin energía"}
          </button>

          <button
            className="bm-refill"
            type="button"
            onClick={refill}
            disabled={data.state.tickets < REFILL_TICKET_COST || data.state.energy >= data.state.max_energy}
          >
            Convertir {REFILL_TICKET_COST} tickets en energía
          </button>
        </section>

        <AnimatePresence mode="wait">
          <motion.section
            className={`bm-feed combo-${combo}`}
            key={feed}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Sparkles size={19} aria-hidden="true" />
            <span>{feed}</span>
          </motion.section>
        </AnimatePresence>

        <section className="bm-ledger" aria-label="Últimas tiradas">
          <div className="bm-sectionTitle">
            <History size={17} aria-hidden="true" />
            <span>Últimas tiradas</span>
          </div>
          <div className="bm-ledgerRows">
            {data.recent_spins.slice(0, 3).map((spin, index) => (
              <div className="bm-ledgerRow" key={spin.id ?? index}>
                <span>{Array.isArray(spin.reels) ? spin.reels.map((key) => symbolFromKey(key).label).join(" · ") : "Giro maestro"}</span>
                <strong>{ledgerRewardCopy(spin)}</strong>
              </div>
            ))}
            {data.recent_spins.length === 0 ? (
              <div className="bm-ledgerRow is-empty">
                <span>Primer giro listo</span>
                <strong>0</strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bm-buildings" aria-label="Construcción del mundo">
          {BUILDINGS.map((building) => {
            const Icon = building.icon;
            const level = data.state.building_levels[building.key];
            const cost = upgradeCost(building.baseCost, level);
            const disabled = data.balances.gold < cost || level >= 5;
            return (
              <article className="bm-building" key={building.key}>
                <div className="bm-buildingIcon"><Icon size={24} aria-hidden="true" /></div>
                <div>
                  <h2>{building.name}</h2>
                  <p>Nivel {level}/5 · {compact(cost)} Gold</p>
                  <div className="bm-miniTrack"><i style={{ transform: `scaleX(${level / 5})` }} /></div>
                </div>
                <button type="button" onClick={() => upgrade(building.key)} disabled={disabled} aria-label={`Mejorar ${building.name}`}>
                  <Hammer size={18} />
                </button>
              </article>
            );
          })}
        </section>

        <section className="bm-missions" aria-label="Misiones rápidas">
          <div className="bm-sectionTitle">
            <Sparkles size={17} aria-hidden="true" />
            <span>Misiones rápidas</span>
          </div>
          <div className="bm-missionGrid">
            <span><Shield size={16} aria-hidden="true" /> {data.state.shields}/5 escudos activos</span>
            <span><Bolt size={16} aria-hidden="true" /> {data.state.energy}/{data.state.max_energy} energía lista</span>
            <span><Trophy size={16} aria-hidden="true" /> {data.state.daily_spins}/{data.state.daily_spin_limit} giros hoy</span>
          </div>
        </section>
      </main>

      <MobileTabBar mobileOnly />

      <style>{`
        .bm-root{--bg:#07030f;--panel:rgba(18,10,38,.78);--line:rgba(255,255,255,.12);
          min-height:100dvh;padding-bottom:calc(92px + env(safe-area-inset-bottom,0px));
          color:#fff;background:radial-gradient(circle at 18% 0%,rgba(255,61,127,.34),transparent 28%),
          radial-gradient(circle at 92% 18%,rgba(0,229,255,.2),transparent 24%),
          linear-gradient(180deg,#10051e,#07030f 70%);font-family:var(--font-sans,Geist,system-ui,sans-serif);overflow-x:hidden}
        .bm-root *{box-sizing:border-box}
        .bm-hud{position:sticky;top:0;z-index:40;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;
          padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;background:linear-gradient(180deg,rgba(7,3,15,.94),rgba(7,3,15,.68));backdrop-filter:blur(16px)}
        .bm-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.07);border:1px solid var(--line)}
        .bm-title{min-width:0}.bm-title span{display:block;color:#ffd93d;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}
        .bm-title strong{display:block;font-size:17px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bm-wallet{display:flex;gap:6px;min-width:0}.bm-wallet span{min-height:34px;display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:0 9px;background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:12px;font-weight:950;white-space:nowrap}
        .bm-wallet svg:first-child{color:#ffd93d}.bm-main{width:min(100%,520px);margin:0 auto;padding:14px 12px 22px}
        .bm-world,.bm-machine,.bm-feed,.bm-building,.bm-ledger,.bm-missions{border:1px solid var(--line);background:var(--panel);box-shadow:0 18px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(16px)}
        .bm-world{min-height:220px;border-radius:24px;padding:22px;display:grid;align-content:space-between;position:relative;overflow:hidden}
        .bm-world:before{content:"";position:absolute;right:-40px;top:-30px;width:190px;height:190px;border-radius:50%;background:conic-gradient(from 20deg,#ff3d7f,#ffd93d,#00e5ff,#b388ff,#ff3d7f);filter:blur(8px);opacity:.24}
        .bm-kicker{display:inline-flex;margin-bottom:10px;color:#83f6ff;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.14em}
        .bm-world h1{position:relative;margin:0;max-width:360px;font-size:36px;line-height:1.02;font-weight:1000;letter-spacing:0}
        .bm-world p{position:relative;margin:12px 0 0;max-width:350px;color:rgba(245,240,255,.68);font-size:14px;line-height:1.45;font-weight:650}
        .bm-progress{position:relative;margin-top:22px;border-radius:17px;background:rgba(0,0,0,.28);padding:12px;overflow:hidden}
        .bm-progress strong{font-size:24px}.bm-progress span{margin-left:8px;color:rgba(255,255,255,.58);font-weight:800;font-size:12px}
        .bm-progress i,.bm-miniTrack i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#00e5ff,#ffd93d,#ff3d7f);transform-origin:left center}
        .bm-progress:after{content:"";display:block;height:7px;margin-top:9px;border-radius:999px;background:rgba(255,255,255,.1)}
        .bm-progress i{position:absolute;left:12px;right:12px;bottom:12px;height:7px}
        .bm-machine{margin-top:12px;border-radius:24px;padding:14px}
        .bm-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .bm-status span{min-height:38px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:5px;background:rgba(255,255,255,.07);font-size:13px;font-weight:950}
        .bm-status svg{color:#ffd93d}.bm-reels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0}
        .bm-reel{min-height:124px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border:1px solid color-mix(in srgb,var(--tone) 48%,transparent);box-shadow:0 0 22px color-mix(in srgb,var(--tone) 18%,transparent)}
        .bm-reel svg{color:var(--tone);filter:drop-shadow(0 0 10px color-mix(in srgb,var(--tone) 65%,transparent))}
        .bm-reel span{font-size:12px;font-weight:950}.bm-spin{width:100%;min-height:66px;border:0;border-radius:22px;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(180deg,#fff07f,#ffc21e 48%,#b86a07);color:#351600;font-size:25px;font-weight:1000;box-shadow:0 0 32px rgba(255,202,45,.55),inset 0 2px 0 rgba(255,255,255,.72);cursor:pointer}
        .bm-spin:disabled,.bm-refill:disabled,.bm-building button:disabled{opacity:.5;cursor:not-allowed}
        .bm-spinIcon{animation:bmSpin .7s linear infinite}.bm-refill{width:100%;min-height:42px;margin-top:9px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-weight:850;cursor:pointer}
        .bm-feed{margin-top:12px;border-radius:18px;padding:13px;display:flex;align-items:center;gap:10px;color:#fff;font-weight:850}.bm-feed svg{color:#ffd93d}.bm-feed.combo-3{border-color:rgba(255,217,61,.42);box-shadow:0 0 26px rgba(255,217,61,.24)}
        .bm-ledger{margin-top:12px;border-radius:18px;padding:13px}.bm-ledgerRows{display:grid;gap:8px;margin-top:10px}.bm-ledgerRow{min-height:40px;border-radius:13px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.07)}
        .bm-ledgerRow span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.72);font-size:12px;font-weight:850}.bm-ledgerRow strong{flex:0 0 auto;color:#ffd93d;font-size:12px}.bm-ledgerRow.is-empty strong{color:rgba(255,255,255,.42)}
        .bm-buildings{display:grid;gap:10px;margin-top:12px}.bm-building{min-height:88px;border-radius:18px;padding:12px;display:grid;grid-template-columns:48px minmax(0,1fr) 44px;gap:10px;align-items:center}
        .bm-buildingIcon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(255,217,61,.12);color:#ffd93d}.bm-building h2{margin:0;font-size:16px;font-weight:1000}.bm-building p{margin:3px 0 8px;color:rgba(255,255,255,.58);font-size:12px;font-weight:750}
        .bm-miniTrack{height:7px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.bm-building button{width:44px;height:44px;border-radius:14px;border:0;background:#ff3d7f;color:#fff;display:grid;place-items:center;cursor:pointer}
        .bm-missions{margin-top:12px;border-radius:18px;padding:13px}
        .bm-sectionTitle{display:flex;align-items:center;gap:8px;color:#ffd93d;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
        .bm-missionGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
        .bm-missionGrid span{min-height:42px;border-radius:14px;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.78);font-size:12px;font-weight:850;text-align:center}
        .bm-missionGrid svg{color:#83f6ff;flex:0 0 auto}
        @keyframes bmSpin{to{transform:rotate(360deg)}}
        @media(min-width:760px){.bm-main{width:min(100% - 28px,980px);display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px}.bm-world{grid-row:span 2}.bm-feed,.bm-ledger,.bm-buildings,.bm-missions{grid-column:1/-1}}
        @media(max-width:420px){.bm-missionGrid{grid-template-columns:1fr}}
        @media(max-width:360px){.bm-world h1{font-size:31px}.bm-reel{min-height:108px}.bm-wallet span{padding:0 7px}.bm-ledgerRow{display:grid;gap:3px}}
        @media(prefers-reduced-motion:reduce){.bm-root *{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}
