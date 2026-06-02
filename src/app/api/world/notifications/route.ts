import { NextResponse } from "next/server";
import { apiError, isRecord, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";
import {
  buildWorldNotifications,
  rouletteSecondsLeftFromLatestSpin,
  type WorldNotificationNode,
} from "@/lib/server/world-notifications";

export const dynamic = "force-dynamic";

const WORLD_ID_RE = /^[a-z0-9_-]{1,80}$/i;

type WorldMapRow = WorldNotificationNode & {
  completed?: boolean;
  stars?: number;
  target_ref?: string | null;
  title?: string;
  unlocked?: boolean;
};

type JackpotRoom = {
  jackpot_gold?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const worldId = searchParams.get("worldId") ?? searchParams.get("world_id") ?? "miami_nights";

  if (!WORLD_ID_RE.test(worldId)) {
    return apiError("invalid_world_id", 400);
  }

  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const now = new Date();
  const [map, daily, bolla, jackpots, roulette, stats] = await Promise.all([
    service.supabase.rpc("service_get_world_map", {
      p_actor_id: auth.user.id,
      p_world_id: worldId,
    }),
    service.supabase.rpc("service_daily_bonus_status", {
      p_actor_id: auth.user.id,
    }),
    service.supabase.rpc("service_get_bolla_master_state", {
      p_actor_id: auth.user.id,
    }),
    service.supabase.rpc("service_room_jackpots", {
      p_actor_id: auth.user.id,
    }),
    service.supabase
      .from("roulette_spin_history")
      .select("created_at")
      .eq("player_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service.supabase
      .from("player_stats")
      .select("current_streak,best_streak")
      .eq("player_id", auth.user.id)
      .maybeSingle(),
  ]);

  const mapRows = Array.isArray(map.data) ? (map.data as WorldMapRow[]) : [];
  const activeNode = mapRows.find((node) => node.unlocked && !node.completed) ?? mapRows.find((node) => node.unlocked) ?? null;
  const activeGameLabel = activeNode ? gameLabelForNode(activeNode) : undefined;

  const dailyStatus = isRecord(daily.data)
    ? {
        available: Boolean(daily.data.available),
        secondsLeft: Number(daily.data.seconds_left ?? 0),
      }
    : null;

  const bollaState = readBollaState(bolla.data);
  const jackpotGold = Array.isArray(jackpots.data)
    ? (jackpots.data as JackpotRoom[]).reduce((sum, room) => sum + Number(room.jackpot_gold ?? 0), 0)
    : 0;

  const latestRouletteSpinAt = isRecord(roulette.data) ? String(roulette.data.created_at ?? "") : "";
  const rouletteSecondsLeft = roulette.error ? null : rouletteSecondsLeftFromLatestSpin(latestRouletteSpinAt, now);

  const notices = buildWorldNotifications({
    activeGameLabel,
    activeNode,
    bollaMaster: bollaState,
    daily: dailyStatus,
    jackpotGold,
    now,
    roulette: rouletteSecondsLeft === null ? null : { secondsLeft: rouletteSecondsLeft },
  });

  return NextResponse.json({
    data: notices,
    meta: {
      generatedAt: now.toISOString(),
      sources: {
        bollaMaster: !bolla.error && !readDataError(bolla.data),
        daily: !daily.error,
        jackpots: !jackpots.error,
        map: !map.error,
        roulette: !roulette.error,
        stats: !stats.error,
      },
      stats: isRecord(stats.data)
        ? {
            bestStreak: Number(stats.data.best_streak ?? 0),
            currentStreak: Number(stats.data.current_streak ?? 0),
          }
        : null,
      worldId,
    },
  });
}

function gameLabelForNode(node: WorldMapRow) {
  const ref = String(node.target_ref ?? "").toLowerCase();
  if (ref.includes("neural")) return "Neural Cascade";
  if (ref.includes("ball")) return "Ball Match";
  if (node.title) return node.title;
  return `Nodo ${node.node_index}`;
}

function readBollaState(raw: unknown) {
  if (!isRecord(raw) || raw.ok !== true || !isRecord(raw.state)) return null;
  return {
    dailySpinLimit: Number(raw.state.daily_spin_limit ?? 5),
    dailySpins: Number(raw.state.daily_spins ?? 0),
    energy: Number(raw.state.energy ?? 0),
    maxEnergy: Number(raw.state.max_energy ?? 5),
    nextEnergyAt: typeof raw.state.next_energy_at === "string" ? raw.state.next_energy_at : null,
    progressPct: Number(raw.state.progress_pct ?? 0),
    tickets: Number(raw.state.tickets ?? 0),
  };
}

function readDataError(raw: unknown) {
  return isRecord(raw) && typeof raw.error === "string" ? raw.error : null;
}
