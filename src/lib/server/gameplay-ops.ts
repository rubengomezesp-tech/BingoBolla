import type { GameplayOpsPayload, GameplayOpsWindow } from "@/lib/telemetry/ops-types";

const WINDOW_CONFIG: Record<GameplayOpsWindow, { bucketCount: number; hours: number; limit: number }> = {
  "1h": { bucketCount: 6, hours: 1, limit: 600 },
  "24h": { bucketCount: 12, hours: 24, limit: 2000 },
  "7d": { bucketCount: 7, hours: 24 * 7, limit: 5000 },
};

type SupabaseLike = {
  from: (table: string) => any;
};

type GameplayEventRow = {
  created_at?: unknown;
  event_name?: unknown;
  metadata?: unknown;
  path?: unknown;
  player_id?: unknown;
  surface?: unknown;
  viewport?: unknown;
};

type EventAccumulator = {
  count: number;
  lastSeenMs: number;
  players: Set<string>;
};

type ActionAccumulator = {
  count: number;
  eventName: string;
  href: string | null;
  label: string | null;
  source: string | null;
  title: string | null;
};

export function parseGameplayOpsWindow(value: string | null): GameplayOpsWindow {
  if (value === "1h" || value === "7d") return value;
  return "24h";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function isoOrNull(ms: number) {
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

function playerRef(value: unknown) {
  const id = stringValue(value);
  if (!id) return "n/d";
  return id.slice(0, 8);
}

function bucketLabel(ms: number, window: GameplayOpsWindow) {
  const date = new Date(ms);
  if (window === "1h" || window === "24h") {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function actionKey(eventName: string, metadata: Record<string, unknown>) {
  return [
    eventName,
    stringValue(metadata.source),
    stringValue(metadata.href),
    stringValue(metadata.title),
    stringValue(metadata.label),
  ].join("|");
}

function buildTrend(rows: GameplayEventRow[], sinceMs: number, nowMs: number, window: GameplayOpsWindow) {
  const config = WINDOW_CONFIG[window];
  const bucketSize = Math.max(1, (nowMs - sinceMs) / config.bucketCount);
  const buckets = Array.from({ length: config.bucketCount }, (_, index) => {
    const startsAt = sinceMs + bucketSize * index;
    return {
      bolla_master: 0,
      eventos: 0,
      label: bucketLabel(startsAt, window),
      other: 0,
      total: 0,
    };
  });

  for (const row of rows) {
    const ms = Date.parse(stringValue(row.created_at));
    if (!Number.isFinite(ms) || ms < sinceMs || ms > nowMs) continue;
    const index = Math.min(config.bucketCount - 1, Math.max(0, Math.floor((ms - sinceMs) / bucketSize)));
    const surface = stringValue(row.surface);
    buckets[index].total += 1;
    if (surface === "bolla_master") buckets[index].bolla_master += 1;
    else if (surface === "eventos") buckets[index].eventos += 1;
    else buckets[index].other += 1;
  }

  return buckets;
}

function buildInsights({
  bollaEvents,
  mobilePct,
  tabSelects,
  totalEvents,
  uniquePlayers,
}: {
  bollaEvents: number;
  mobilePct: number;
  tabSelects: number;
  totalEvents: number;
  uniquePlayers: number;
}): GameplayOpsPayload["insights"] {
  const insights: GameplayOpsPayload["insights"] = [];

  if (totalEvents === 0) {
    insights.push({
      severity: "watch",
      title: "Sin muestra todavía",
      detail: "La tabla está lista, pero aún no hay actividad en esta ventana.",
    });
    return insights;
  }

  if (uniquePlayers <= 1 && totalEvents >= 10) {
    insights.push({
      severity: "watch",
      title: "Muestra concentrada",
      detail: "Hay actividad, pero pocos jugadores. Evita decidir balance hasta ampliar muestra.",
    });
  }

  if (mobilePct >= 70) {
    insights.push({
      severity: "good",
      title: "Lectura mobile-first",
      detail: `${mobilePct}% de eventos vienen de pantallas pequeñas. Prioriza gestos cortos y CTAs táctiles.`,
    });
  }

  if (tabSelects > 0 && bollaEvents === 0) {
    insights.push({
      severity: "watch",
      title: "Interés sin loop profundo",
      detail: "Hay exploración en eventos, pero no se ve Bolla Master en la ventana. Revisa CTA o posición.",
    });
  }

  if (bollaEvents >= 3) {
    insights.push({
      severity: "good",
      title: "Bolla Master genera señal",
      detail: "El nuevo modo ya produce eventos de giro, recarga o upgrade para analizar retención.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "good",
      title: "Base de observabilidad sana",
      detail: "La ventana tiene actividad suficiente para empezar a comparar superficies.",
    });
  }

  return insights.slice(0, 4);
}

export async function loadGameplayOps(
  supabase: SupabaseLike,
  { window = "24h" as GameplayOpsWindow }: { window?: GameplayOpsWindow } = {},
): Promise<GameplayOpsPayload> {
  const config = WINDOW_CONFIG[window];
  const nowMs = Date.now();
  const sinceMs = nowMs - config.hours * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const { data, error } = await supabase
    .from("gameplay_events")
    .select("player_id,event_name,surface,path,metadata,viewport,created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(config.limit);

  if (error) {
    if (error.code === "42P01") {
      return emptyGameplayOps(window);
    }
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as GameplayEventRow[];
  const players = new Set<string>();
  const events = new Map<string, EventAccumulator>();
  const surfaces = new Map<string, EventAccumulator>();
  const actions = new Map<string, ActionAccumulator>();
  let mobileCount = 0;
  let tabSelects = 0;
  let bollaEvents = 0;
  let latestMs = 0;

  for (const row of rows) {
    const playerId = stringValue(row.player_id);
    const eventName = stringValue(row.event_name) || "unknown";
    const surface = stringValue(row.surface) || "unknown";
    const metadata = safeRecord(row.metadata);
    const viewport = safeRecord(row.viewport);
    const createdMs = Date.parse(stringValue(row.created_at));

    if (playerId) players.add(playerId);
    if (Number.isFinite(createdMs)) latestMs = Math.max(latestMs, createdMs);
    if (num(viewport.width) > 0 && num(viewport.width) <= 640) mobileCount += 1;
    if (eventName === "events.tab_select") tabSelects += 1;
    if (surface === "bolla_master") bollaEvents += 1;

    const eventAcc = events.get(eventName) ?? { count: 0, lastSeenMs: 0, players: new Set<string>() };
    eventAcc.count += 1;
    eventAcc.lastSeenMs = Math.max(eventAcc.lastSeenMs, Number.isFinite(createdMs) ? createdMs : 0);
    if (playerId) eventAcc.players.add(playerId);
    events.set(eventName, eventAcc);

    const surfaceAcc = surfaces.get(surface) ?? { count: 0, lastSeenMs: 0, players: new Set<string>() };
    surfaceAcc.count += 1;
    surfaceAcc.lastSeenMs = Math.max(surfaceAcc.lastSeenMs, Number.isFinite(createdMs) ? createdMs : 0);
    if (playerId) surfaceAcc.players.add(playerId);
    surfaces.set(surface, surfaceAcc);

    if (eventName.includes("_open") || eventName.startsWith("bolla_master.")) {
      const key = actionKey(eventName, metadata);
      const existing = actions.get(key) ?? {
        count: 0,
        eventName,
        href: stringValue(metadata.href) || null,
        label: stringValue(metadata.label) || null,
        source: stringValue(metadata.source) || null,
        title: stringValue(metadata.title) || null,
      };
      existing.count += 1;
      actions.set(key, existing);
    }
  }

  const totalEvents = rows.length;
  const uniquePlayers = players.size;

  return {
    generated_at: new Date(nowMs).toISOString(),
    window,
    limited: rows.length >= config.limit,
    health: {
      bolla_events: bollaEvents,
      events_per_player: uniquePlayers > 0 ? Math.round((totalEvents / uniquePlayers) * 10) / 10 : 0,
      latest_at: isoOrNull(latestMs),
      mobile_pct: pct(mobileCount, totalEvents),
      tab_selects: tabSelects,
      total_events: totalEvents,
      unique_players: uniquePlayers,
    },
    event_breakdown: Array.from(events.entries())
      .map(([event_name, acc]) => ({
        count: acc.count,
        event_name,
        last_seen: isoOrNull(acc.lastSeenMs),
        unique_players: acc.players.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    surface_breakdown: Array.from(surfaces.entries())
      .map(([surface, acc]) => ({
        count: acc.count,
        surface,
        unique_players: acc.players.size,
      }))
      .sort((a, b) => b.count - a.count),
    action_breakdown: Array.from(actions.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((action) => ({
        count: action.count,
        event_name: action.eventName,
        href: action.href,
        label: action.label,
        source: action.source,
        title: action.title,
      })),
    insights: buildInsights({
      bollaEvents,
      mobilePct: pct(mobileCount, totalEvents),
      tabSelects,
      totalEvents,
      uniquePlayers,
    }),
    recent_events: rows.slice(0, 24).map((row) => ({
      created_at: stringValue(row.created_at),
      event_name: stringValue(row.event_name) || "unknown",
      metadata: safeRecord(row.metadata),
      path: stringValue(row.path) || null,
      player_ref: playerRef(row.player_id),
      surface: stringValue(row.surface) || "unknown",
      viewport: safeRecord(row.viewport),
    })),
    trend: buildTrend(rows, sinceMs, nowMs, window),
  };
}

function emptyGameplayOps(window: GameplayOpsWindow): GameplayOpsPayload {
  const now = new Date().toISOString();
  return {
    generated_at: now,
    window,
    limited: false,
    health: {
      bolla_events: 0,
      events_per_player: 0,
      latest_at: null,
      mobile_pct: 0,
      tab_selects: 0,
      total_events: 0,
      unique_players: 0,
    },
    event_breakdown: [],
    surface_breakdown: [],
    action_breakdown: [],
    insights: [{ severity: "watch", title: "Tabla no disponible", detail: "Aplica la migración gameplay_events_observability." }],
    recent_events: [],
    trend: [],
  };
}
