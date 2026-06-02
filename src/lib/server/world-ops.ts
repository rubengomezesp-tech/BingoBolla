import type { WorldOpsPayload, WorldOpsWindow } from "@/lib/world/ops-types";

const WINDOW_CONFIG: Record<WorldOpsWindow, { bucketCount: number; hours: number }> = {
  "24h": { bucketCount: 12, hours: 24 },
  "7d": { bucketCount: 7, hours: 24 * 7 },
  "30d": { bucketCount: 10, hours: 24 * 30 },
};

const DEFAULT_LIMIT = 500;

type SupabaseLike = {
  from: (table: string) => any;
};

type RunRow = {
  attempt_hash?: unknown;
  client_elapsed_ms?: unknown;
  completed_at?: unknown;
  expires_at?: unknown;
  game?: unknown;
  id?: unknown;
  player_id?: unknown;
  score?: unknown;
  stars?: unknown;
  started_at?: unknown;
  status?: unknown;
  validation_flags?: unknown;
  validation_risk?: unknown;
};

type RewardRow = {
  created_at?: unknown;
  gold_awarded?: unknown;
  star_delta?: unknown;
  xp_awarded?: unknown;
};

export function parseWorldOpsWindow(value: string | null): WorldOpsWindow {
  if (value === "7d" || value === "30d") return value;
  return "24h";
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return round((part / total) * 100);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isoOrNull(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function flagList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((flag): flag is string => typeof flag === "string" && flag.length > 0);
}

function gameLabel(value: unknown) {
  const game = stringValue(value);
  return game || "unknown";
}

function riskPosture(highRiskRuns: number, completedRuns: number): WorldOpsPayload["health"]["risk_posture"] {
  const highRiskRate = completedRuns > 0 ? highRiskRuns / completedRuns : 0;
  if (highRiskRate >= 0.08 || highRiskRuns >= 10) return "hot";
  if (highRiskRate >= 0.02 || highRiskRuns >= 3) return "watch";
  return "normal";
}

function bucketLabel(ms: number, window: WorldOpsWindow) {
  const date = new Date(ms);
  if (window === "24h") {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function buildTrend({
  nowMs,
  rewards,
  runs,
  sinceMs,
  window,
}: {
  nowMs: number;
  rewards: RewardRow[];
  runs: RunRow[];
  sinceMs: number;
  window: WorldOpsWindow;
}) {
  const { bucketCount } = WINDOW_CONFIG[window];
  const bucketSize = Math.max(1, (nowMs - sinceMs) / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const startsAt = sinceMs + bucketSize * index;
    return {
      completed: 0,
      high_risk: 0,
      label: bucketLabel(startsAt, window),
      started: 0,
      xp_awarded: 0,
    };
  });

  function indexFor(value: unknown) {
    const ms = Date.parse(stringValue(value));
    if (!Number.isFinite(ms) || ms < sinceMs || ms > nowMs) return -1;
    return Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - sinceMs) / bucketSize)));
  }

  for (const run of runs) {
    const index = indexFor(run.started_at);
    if (index < 0) continue;

    buckets[index].started += 1;
    if (run.status === "completed") {
      buckets[index].completed += 1;
      if (int(run.validation_risk) >= 50) buckets[index].high_risk += 1;
    }
  }

  for (const reward of rewards) {
    const index = indexFor(reward.created_at);
    if (index < 0) continue;
    buckets[index].xp_awarded += int(reward.xp_awarded);
  }

  return buckets;
}

export async function loadWorldOps(
  supabase: SupabaseLike,
  options: { limit?: number; window?: WorldOpsWindow } = {}
): Promise<WorldOpsPayload> {
  const window = options.window ?? "24h";
  const limit = Math.max(50, Math.min(options.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT));
  const nowMs = Date.now();
  const sinceMs = nowMs - WINDOW_CONFIG[window].hours * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const [runsResult, rewardsResult] = await Promise.all([
    supabase
      .from("world_game_runs")
      .select(
        "id,player_id,game,status,started_at,expires_at,completed_at,score,stars,attempt_hash,validation_risk,validation_flags,client_elapsed_ms"
      )
      .gte("started_at", sinceIso)
      .order("started_at", { ascending: false })
      .limit(limit),
    supabase
      .from("world_node_reward_claims")
      .select("created_at,xp_awarded,gold_awarded,star_delta")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (runsResult.error) {
    throw new Error("world_runs_query_failed");
  }
  if (rewardsResult.error) {
    throw new Error("world_rewards_query_failed");
  }

  const runs = (Array.isArray(runsResult.data) ? runsResult.data : []) as RunRow[];
  const rewards = (Array.isArray(rewardsResult.data) ? rewardsResult.data : []) as RewardRow[];
  const completedRuns = runs.filter((run) => run.status === "completed");
  const startedRuns = runs.filter((run) => run.status === "started");
  const cancelledRuns = runs.filter((run) => run.status === "cancelled").length;
  const expiredRuns = runs.filter((run) => run.status === "expired").length;
  const liveRuns = startedRuns.filter((run) => Date.parse(stringValue(run.expires_at)) > nowMs).length;
  const staleRuns = startedRuns.length - liveRuns;
  const highRiskRuns = completedRuns.filter((run) => int(run.validation_risk) >= 50).length;
  const criticalRiskRuns = completedRuns.filter((run) => int(run.validation_risk) >= 75).length;
  const auditedRuns = completedRuns.filter((run) => stringValue(run.attempt_hash)).length;
  const elapsedRuns = completedRuns
    .map((run) => int(run.client_elapsed_ms, -1))
    .filter((elapsed) => elapsed >= 0);
  const riskSum = completedRuns.reduce((sum, run) => sum + int(run.validation_risk), 0);

  const rewardTotals = rewards.reduce(
    (acc, reward) => {
      acc.gold += num(reward.gold_awarded);
      acc.starDelta += int(reward.star_delta);
      acc.xp += int(reward.xp_awarded);
      return acc;
    },
    { gold: 0, starDelta: 0, xp: 0 }
  );

  const games = new Map<
    string,
    { completed: number; highRisk: number; riskSum: number; runs: number }
  >();
  for (const run of runs) {
    const game = gameLabel(run.game);
    const current = games.get(game) ?? { completed: 0, highRisk: 0, riskSum: 0, runs: 0 };
    current.runs += 1;
    if (run.status === "completed") {
      current.completed += 1;
      current.riskSum += int(run.validation_risk);
      if (int(run.validation_risk) >= 50) current.highRisk += 1;
    }
    games.set(game, current);
  }

  const flagCounts = new Map<string, number>();
  for (const run of completedRuns) {
    for (const flag of flagList(run.validation_flags)) {
      flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
    }
  }

  const recentRisk = completedRuns
    .filter((run) => int(run.validation_risk) > 0 || flagList(run.validation_flags).length > 0)
    .sort((a, b) => {
      const riskDelta = int(b.validation_risk) - int(a.validation_risk);
      if (riskDelta !== 0) return riskDelta;
      return Date.parse(stringValue(b.completed_at)) - Date.parse(stringValue(a.completed_at));
    })
    .slice(0, 12)
    .map((run) => ({
      attempt_hash: stringValue(run.attempt_hash) || null,
      client_elapsed_ms: run.client_elapsed_ms === null || run.client_elapsed_ms === undefined
        ? null
        : int(run.client_elapsed_ms),
      completed_at: isoOrNull(run.completed_at),
      flags: flagList(run.validation_flags),
      game: gameLabel(run.game),
      id: stringValue(run.id),
      player_id: stringValue(run.player_id),
      score: num(run.score),
      stars: int(run.stars),
      validation_risk: int(run.validation_risk),
    }));

  return {
    generated_at: new Date(nowMs).toISOString(),
    window,
    limited: runs.length >= limit || rewards.length >= limit,
    health: {
      audit_coverage_pct: pct(auditedRuns, completedRuns.length),
      avg_elapsed_ms: elapsedRuns.length
        ? Math.round(elapsedRuns.reduce((sum, elapsed) => sum + elapsed, 0) / elapsedRuns.length)
        : 0,
      avg_risk: completedRuns.length ? round(riskSum / completedRuns.length) : 0,
      cancelled_runs: cancelledRuns,
      completed_runs: completedRuns.length,
      completion_rate_pct: pct(completedRuns.length, runs.length),
      critical_risk_runs: criticalRiskRuns,
      expired_runs: expiredRuns,
      gold_awarded: round(rewardTotals.gold, 2),
      high_risk_runs: highRiskRuns,
      live_runs: liveRuns,
      reward_claims: rewards.length,
      risk_posture: riskPosture(highRiskRuns, completedRuns.length),
      run_volume: runs.length,
      stale_runs: staleRuns,
      star_delta: rewardTotals.starDelta,
      started_runs: startedRuns.length,
      xp_awarded: rewardTotals.xp,
    },
    game_breakdown: Array.from(games.entries())
      .map(([game, value]) => ({
        avg_risk: value.completed ? round(value.riskSum / value.completed) : 0,
        completed: value.completed,
        completion_rate_pct: pct(value.completed, value.runs),
        game,
        high_risk: value.highRisk,
        runs: value.runs,
      }))
      .sort((a, b) => b.runs - a.runs),
    flag_breakdown: Array.from(flagCounts.entries())
      .map(([flag, count]) => ({ count, flag }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    recent_risk: recentRisk,
    trend: buildTrend({ nowMs, rewards, runs, sinceMs, window }),
  };
}
