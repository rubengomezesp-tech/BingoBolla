export type WorldNotificationTone = "mission" | "ready" | "cooldown" | "vip" | "bonus";
export type WorldNotificationIcon = "star" | "gift" | "rotate" | "crown" | "user-plus" | "zap";

export type WorldNotificationAction =
  | { type: "play_node"; nodeId: string }
  | { type: "route"; href: string };

export type WorldNotification = {
  id: string;
  action: WorldNotificationAction;
  assetKey?: string;
  badge: string;
  cta: string;
  detail: string;
  icon: WorldNotificationIcon;
  label: string;
  priority: number;
  secondsLeft?: number;
  timer: string;
  title: string;
  tone: WorldNotificationTone;
};

export type WorldNotificationNode = {
  node_id: string;
  node_index: number;
  reward_gold: number;
  reward_xp: number;
  max_stars: number;
  title?: string;
};

export type WorldNotificationInput = {
  activeGameLabel?: string;
  activeNode?: WorldNotificationNode | null;
  bollaMaster?: {
    dailySpinLimit?: number;
    dailySpins?: number;
    energy?: number;
    maxEnergy?: number;
    nextEnergyAt?: string | null;
    progressPct?: number;
    tickets?: number;
  } | null;
  daily?: {
    available?: boolean;
    secondsLeft?: number;
  } | null;
  jackpotGold?: number;
  now?: Date;
  roulette?: {
    secondsLeft?: number;
  } | null;
};

const ROULETTE_COOLDOWN_SECONDS = 8 * 3600;
const BOLLA_MASTER_DAILY_SPIN_DISPLAY_CAP = 30;

export function buildWorldNotifications(input: WorldNotificationInput) {
  const now = input.now ?? new Date();
  const notices: WorldNotification[] = [];

  if (input.activeNode) {
    const activeGameLabel = input.activeGameLabel || input.activeNode.title || `Nodo ${input.activeNode.node_index}`;
    notices.push({
      id: "mission",
      icon: "star",
      label: "Nodo listo",
      timer: `Nivel ${input.activeNode.node_index}`,
      badge: "1",
      tone: "mission",
      title: `${activeGameLabel} está listo`,
      detail: `Completa el nodo ${input.activeNode.node_index} para sumar hasta ${input.activeNode.max_stars} estrellas, ${formatCompact(input.activeNode.reward_xp)} XP y ${formatCompact(input.activeNode.reward_gold)} Gold.`,
      cta: "Jugar nodo",
      action: { type: "play_node", nodeId: input.activeNode.node_id },
      priority: 100,
    });
  }

  const dailyKnown = input.daily !== null && input.daily !== undefined;
  const dailySecondsLeft = dailyKnown ? Math.max(0, Math.trunc(Number(input.daily?.secondsLeft ?? 0))) : 0;
  const dailyAvailable = dailyKnown && (Boolean(input.daily?.available) || dailySecondsLeft <= 0);
  notices.push({
    id: "daily",
    icon: "gift",
    assetKey: "icon-regalo-diario",
    label: "Regalo diario",
    timer: dailyKnown ? dailyAvailable ? "Listo ahora" : formatDuration(dailySecondsLeft) : "Ver estado",
    badge: dailyAvailable ? "1" : "",
    tone: dailyAvailable ? "ready" : "cooldown",
    title: dailyAvailable ? "Regalo diario listo" : dailyKnown ? "Regalo diario reclamado" : "Regalo diario",
    detail: dailyAvailable
      ? "Reclama 500 Gold y 0.50 SC antes de avanzar en Miami."
      : dailyKnown
        ? `El siguiente regalo se activa en ${formatDuration(dailySecondsLeft)}.`
        : "Entra para sincronizar el estado del premio diario.",
    cta: dailyAvailable ? "Reclamar regalo" : "Ver regalo",
    action: { type: "route", href: "/regalo" },
    secondsLeft: dailySecondsLeft,
    priority: dailyAvailable ? 90 : 42,
  });

  const bolla = input.bollaMaster;
  if (bolla) {
    const energy = Math.max(0, Math.trunc(Number(bolla.energy ?? 0)));
    const maxEnergy = Math.max(1, Math.trunc(Number(bolla.maxEnergy ?? 5)));
    const dailySpinLimit = Math.min(
      BOLLA_MASTER_DAILY_SPIN_DISPLAY_CAP,
      Math.max(1, Math.trunc(Number(bolla.dailySpinLimit ?? BOLLA_MASTER_DAILY_SPIN_DISPLAY_CAP)))
    );
    const dailySpins = Math.min(dailySpinLimit, Math.max(0, Math.trunc(Number(bolla.dailySpins ?? 0))));
    const spinsLeft = Math.max(0, dailySpinLimit - dailySpins);
    const spinsReadyNow = Math.min(energy, spinsLeft);
    const nextEnergySeconds = secondsUntil(bolla.nextEnergyAt, now);
    const ready = spinsReadyNow > 0;
    notices.push({
      id: "bolla-master",
      icon: "zap",
      label: "Bolla Master",
      timer: ready ? `${energy}/${maxEnergy} energía` : nextEnergySeconds > 0 ? formatDuration(nextEnergySeconds) : "Recarga",
      badge: ready ? String(Math.min(9, spinsReadyNow)) : "",
      tone: ready ? "ready" : "cooldown",
      title: ready ? "Bolla Master tiene tiradas" : "Bolla Master en recarga",
      detail: ready
        ? `Puedes hacer ${spinsReadyNow} tirada${spinsReadyNow === 1 ? "" : "s"} ahora. Quedan ${spinsLeft} del plan diario, progreso ${Math.max(0, Math.trunc(Number(bolla.progressPct ?? 0)))}%.`
        : nextEnergySeconds > 0
          ? `Nueva energía en ${formatDuration(nextEnergySeconds)}. Tickets: ${formatCompact(Number(bolla.tickets ?? 0))}.`
          : "Recarga energía o vuelve cuando el contador esté listo.",
      cta: ready ? "Entrar a Bolla Master" : "Ver estado",
      action: { type: "route", href: "/bolla-master" },
      secondsLeft: nextEnergySeconds,
      priority: ready ? 86 : 38,
    });
  }

  const rouletteKnown = input.roulette !== null && input.roulette !== undefined && typeof input.roulette.secondsLeft === "number";
  const rouletteSecondsLeft = rouletteKnown
    ? Math.max(0, Math.trunc(Number(input.roulette?.secondsLeft ?? 0)))
    : ROULETTE_COOLDOWN_SECONDS;
  const rouletteReady = rouletteKnown && rouletteSecondsLeft <= 0;
  notices.push({
    id: "spin",
    icon: "rotate",
    assetKey: "icon-gira-gana",
    label: "Gira y gana",
    timer: rouletteKnown ? rouletteReady ? "Listo ahora" : formatDuration(rouletteSecondsLeft) : "Ver estado",
    badge: rouletteReady ? "1" : "",
    tone: rouletteReady ? "ready" : "cooldown",
    title: rouletteReady ? "Ruleta diaria lista" : rouletteKnown ? "Ruleta en recarga" : "Ruleta diaria",
    detail: rouletteReady
      ? "Hay una tirada disponible para monedas, SC o Diamonds."
      : rouletteKnown
        ? `La próxima tirada gratuita se libera en ${formatDuration(rouletteSecondsLeft)}.`
        : "Entra para sincronizar tu tirada gratuita y premios activos.",
    cta: rouletteReady ? "Girar ruleta" : "Ver ruleta",
    action: { type: "route", href: "/ruleta" },
    secondsLeft: rouletteSecondsLeft,
    priority: rouletteReady ? 84 : 34,
  });

  const jackpotGold = Math.max(0, Number(input.jackpotGold ?? 0));
  notices.push({
    id: "vip",
    icon: "crown",
    assetKey: "icon-cofre-vip",
    label: "Cofre VIP",
    timer: jackpotGold > 0 ? `${formatCompact(jackpotGold)} Gold` : "VIP",
    badge: jackpotGold >= 1_000_000 ? "!" : "",
    tone: "vip",
    title: jackpotGold > 0 ? "Jackpot vivo conectado" : "Cofre VIP disponible",
    detail: jackpotGold > 0
      ? `Pozo acumulado visible: ${formatCompact(jackpotGold)} Gold. Revisa salas y cofres premium.`
      : "Revisa cofres premium y recompensas agrupadas.",
    cta: "Ver cofre",
    action: { type: "route", href: "/vip" },
    priority: jackpotGold > 0 ? 62 : 30,
  });

  notices.push({
    id: "invite",
    icon: "user-plus",
    assetKey: "icon-invitar",
    label: "Invitar amigos",
    timer: "+100 diamantes",
    badge: "",
    tone: "bonus",
    title: "Bonus por comunidad",
    detail: "Invita jugadores activos y usa los diamantes para acelerar progreso y modos premium.",
    cta: "Invitar ahora",
    action: { type: "route", href: "/invitar" },
    priority: 22,
  });

  return notices.sort((a, b) => b.priority - a.priority);
}

export function rouletteSecondsLeftFromLatestSpin(latestSpinAt: string | null | undefined, now = new Date()) {
  if (!latestSpinAt) return 0;
  const elapsedSeconds = Math.floor((now.getTime() - new Date(latestSpinAt).getTime()) / 1000);
  return Math.max(0, ROULETTE_COOLDOWN_SECONDS - elapsedSeconds);
}

export function secondsUntil(value: string | null | undefined, now = new Date()) {
  if (!value) return 0;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - now.getTime()) / 1000));
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${safeSeconds}s`;
}

function formatCompact(value: number) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}M`;
  if (safeValue >= 1_000) return `${(safeValue / 1_000).toFixed(1)}K`;
  return String(Math.round(safeValue));
}
