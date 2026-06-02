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
  node_id?: unknown;
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
  node_id?: unknown;
  star_delta?: unknown;
  xp_awarded?: unknown;
};

type NodeRow = {
  active?: unknown;
  id?: unknown;
  max_stars?: unknown;
  node_index?: unknown;
  node_type?: unknown;
  reward_gold?: unknown;
  reward_xp?: unknown;
  target_ref?: unknown;
  title?: unknown;
  world_id?: unknown;
};

type ProgressRow = {
  best_score?: unknown;
  completed?: unknown;
  node_id?: unknown;
  player_id?: unknown;
  stars?: unknown;
};

type NodeAccumulator = {
  elapsedSum: number;
  elapsedSamples: number;
  flags: number;
  goldAwarded: number;
  highRisk: number;
  progressCompletions: number;
  progressStars: number;
  rewardClaims: number;
  riskSum: number;
  runCompleted: number;
  runCount: number;
  scoreSum: number;
  starSum: number;
  uniquePlayers: Set<string>;
  xpAwarded: number;
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

function gameForTarget(targetRef: unknown, nodeType: unknown) {
  const ref = stringValue(targetRef).toLowerCase();
  const type = stringValue(nodeType).toLowerCase();
  if (ref.includes("neural") || ref.includes("boss")) return "neural_cascade";
  if (ref.includes("ball") || ref.includes("bolla") || ref.includes("numbers")) return "ballmatch";
  if (type === "boss") return "neural_cascade";
  if (type === "minigame") return "ballmatch";
  return "world";
}

function median(values: number[], fallback = 1) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return fallback;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
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

function blankAccumulator(): NodeAccumulator {
  return {
    elapsedSum: 0,
    elapsedSamples: 0,
    flags: 0,
    goldAwarded: 0,
    highRisk: 0,
    progressCompletions: 0,
    progressStars: 0,
    rewardClaims: 0,
    riskSum: 0,
    runCompleted: 0,
    runCount: 0,
    scoreSum: 0,
    starSum: 0,
    uniquePlayers: new Set<string>(),
    xpAwarded: 0,
  };
}

function recommendationText({
  completionRate,
  highRisk,
  node,
  rewardPressure,
  runCount,
  starRate,
}: {
  completionRate: number;
  highRisk: number;
  node: NodeRow;
  rewardPressure: number;
  runCount: number;
  starRate: number;
}) {
  if (runCount < 3) return "Recolectar mas muestra antes de balancear.";
  if (highRisk >= 2) return "Revisar exploit o telemetria anomala antes de subir premios.";
  if (completionRate < 45 && rewardPressure < 85) return "Subir recompensa o suavizar objetivo: friccion alta con payout bajo.";
  if (completionRate < 45) return "Suavizar dificultad: demasiados intentos no llegan a cierre.";
  if (starRate < 50) return "Ajustar 3 estrellas: el clear existe, pero la maestria esta dura.";
  if (completionRate > 85 && rewardPressure > 140) return "Reducir payout futuro o endurecer bonus: nodo generoso y facil.";
  if (stringValue(node.node_type) === "boss" && completionRate > 75) return "Boss posiblemente suave: anadir fase o elevar score target.";
  return "Mantener y observar tendencia.";
}

function buildBalance({
  nodes,
  progress,
  rewards,
  runs,
}: {
  nodes: NodeRow[];
  progress: ProgressRow[];
  rewards: RewardRow[];
  runs: RunRow[];
}): WorldOpsPayload["balance"] {
  const activeNodes = nodes
    .filter((node) => node.active !== false)
    .sort((a, b) => int(a.node_index) - int(b.node_index));
  const accByNode = new Map<string, NodeAccumulator>();
  const ensure = (nodeId: unknown) => {
    const id = stringValue(nodeId);
    if (!id) return null;
    const current = accByNode.get(id) ?? blankAccumulator();
    accByNode.set(id, current);
    return current;
  };

  for (const run of runs) {
    const acc = ensure(run.node_id);
    if (!acc) continue;

    acc.runCount += 1;
    const playerId = stringValue(run.player_id);
    if (playerId) acc.uniquePlayers.add(playerId);
    if (run.status === "completed") {
      acc.runCompleted += 1;
      acc.riskSum += int(run.validation_risk);
      acc.starSum += int(run.stars);
      acc.scoreSum += num(run.score);
      acc.flags += flagList(run.validation_flags).length;
      if (int(run.validation_risk) >= 50) acc.highRisk += 1;

      const elapsed = int(run.client_elapsed_ms, -1);
      if (elapsed >= 0) {
        acc.elapsedSamples += 1;
        acc.elapsedSum += elapsed;
      }
    }
  }

  for (const reward of rewards) {
    const acc = ensure(reward.node_id);
    if (!acc) continue;

    acc.rewardClaims += 1;
    acc.goldAwarded += num(reward.gold_awarded);
    acc.xpAwarded += int(reward.xp_awarded);
  }

  for (const row of progress) {
    if (row.completed !== true) continue;
    const acc = ensure(row.node_id);
    if (!acc) continue;

    acc.progressCompletions += 1;
    acc.progressStars += int(row.stars);
    const playerId = stringValue(row.player_id);
    if (playerId) acc.uniquePlayers.add(playerId);
  }

  const goldPerStarMedian = median(
    activeNodes.map((node) => num(node.reward_gold) / Math.max(1, int(node.max_stars, 3))),
    100
  );
  const xpPerStarMedian = median(
    activeNodes.map((node) => num(node.reward_xp) / Math.max(1, int(node.max_stars, 3))),
    25
  );

  const nodeCards = activeNodes.map((node) => {
    const nodeId = stringValue(node.id);
    const acc = accByNode.get(nodeId) ?? blankAccumulator();
    const maxStars = Math.max(1, int(node.max_stars, 3));
    const rewardGold = num(node.reward_gold);
    const rewardXp = int(node.reward_xp);
    const goldPerStar = rewardGold / maxStars;
    const xpPerStar = rewardXp / maxStars;
    const rewardPressure = round(((goldPerStar / goldPerStarMedian) + (xpPerStar / xpPerStarMedian)) * 50, 0);
    const completionRate = pct(acc.runCompleted, acc.runCount);
    const avgStars = acc.runCompleted ? round(acc.starSum / acc.runCompleted, 2) : 0;
    const starRate = pct(avgStars, maxStars);
    const avgRisk = acc.runCompleted ? round(acc.riskSum / acc.runCompleted) : 0;
    const economyScore = round(Math.max(0, Math.min(200, rewardPressure - avgRisk * 0.35)));
    const frictionScore = round(
      Math.max(0, Math.min(100, (acc.runCount >= 3 ? 100 - completionRate : 35) + (100 - starRate) * 0.25 + avgRisk * 0.25))
    );

    return {
      avg_elapsed_ms: acc.elapsedSamples ? Math.round(acc.elapsedSum / acc.elapsedSamples) : 0,
      avg_risk: avgRisk,
      avg_score: acc.runCompleted ? Math.round(acc.scoreSum / acc.runCompleted) : 0,
      avg_stars: avgStars,
      claims: acc.rewardClaims,
      completed_runs: acc.runCompleted,
      completion_rate_pct: completionRate,
      economy_score: economyScore,
      friction_score: frictionScore,
      game: gameForTarget(node.target_ref, node.node_type),
      gold_awarded: round(acc.goldAwarded, 2),
      high_risk_runs: acc.highRisk,
      max_stars: maxStars,
      node_id: nodeId,
      node_index: int(node.node_index),
      node_type: stringValue(node.node_type),
      progress_completions: acc.progressCompletions,
      recommendation: recommendationText({
        completionRate,
        highRisk: acc.highRisk,
        node,
        rewardPressure,
        runCount: acc.runCount,
        starRate,
      }),
      reward_gold: rewardGold,
      reward_pressure: rewardPressure,
      reward_xp: rewardXp,
      run_count: acc.runCount,
      star_rate_pct: starRate,
      target_ref: stringValue(node.target_ref) || null,
      title: stringValue(node.title),
      unique_players: acc.uniquePlayers.size,
      xp_awarded: acc.xpAwarded,
    };
  });

  const recommendations: WorldOpsPayload["balance"]["recommendations"] = [];
  const pushRecommendation = (
    card: (typeof nodeCards)[number],
    recommendation: Omit<WorldOpsPayload["balance"]["recommendations"][number], "game" | "id" | "node_id" | "node_index">
  ) => {
    recommendations.push({
      ...recommendation,
      game: card.game,
      id: `${card.node_id}:${recommendation.type}:${recommendation.title}`,
      node_id: card.node_id,
      node_index: card.node_index,
    });
  };

  for (const card of nodeCards) {
    const confidence = Math.min(95, 35 + card.run_count * 8 + card.progress_completions * 3);
    if (card.run_count < 3 && card.node_index <= 4) {
      pushRecommendation(card, {
        action: "Dar mas visibilidad al nodo o revisar si el camino lo desbloquea correctamente.",
        confidence: Math.max(20, confidence),
        detail: `${card.title} apenas tiene muestra reciente (${card.run_count} runs).`,
        severity: "opportunity",
        title: "Muestra baja en nodo temprano",
        type: "retention",
      });
    }
    if (card.run_count >= 5 && card.completion_rate_pct < 45) {
      pushRecommendation(card, {
        action: "Bajar objetivo, subir movimientos/relays o reducir castigo por fallo.",
        confidence,
        detail: `${card.title} convierte ${card.completion_rate_pct}% con ${card.run_count} intentos.`,
        severity: card.completion_rate_pct < 25 ? "critical" : "warning",
        title: "Friccion alta",
        type: "difficulty",
      });
    }
    if (card.completed_runs >= 5 && card.star_rate_pct < 50) {
      pushRecommendation(card, {
        action: "Separar clear de mastery: mantener victoria y relajar umbral de 3 estrellas.",
        confidence,
        detail: `${card.title} tiene estrella media baja (${card.avg_stars}/${card.max_stars}).`,
        severity: "warning",
        title: "Maestria demasiado dura",
        type: "difficulty",
      });
    }
    if (card.high_risk_runs >= 2 || card.avg_risk >= 40) {
      pushRecommendation(card, {
        action: "Revisar flags antes de incrementar payout o lanzar eventos sobre este juego.",
        confidence,
        detail: `${card.title} acumula riesgo medio ${card.avg_risk} y ${card.high_risk_runs} runs high-risk.`,
        severity: card.avg_risk >= 65 ? "critical" : "warning",
        title: "Riesgo antifraude concentrado",
        type: "risk",
      });
    }
    if (card.reward_pressure > 150 && card.completion_rate_pct > 80 && card.run_count >= 5) {
      pushRecommendation(card, {
        action: "Mover parte del premio a bonus condicional o subir exigencia de estrellas.",
        confidence,
        detail: `${card.title} combina payout ${card.reward_pressure} y conversion ${card.completion_rate_pct}%.`,
        severity: "warning",
        title: "Payout generoso para dificultad baja",
        type: "economy",
      });
    }
    if (card.reward_pressure < 70 && card.friction_score > 65 && card.run_count >= 3) {
      pushRecommendation(card, {
        action: "Subir XP/Gold o convertirlo en nodo de calentamiento con feedback mas jugoso.",
        confidence,
        detail: `${card.title} parece duro para la recompensa relativa (${card.reward_pressure}).`,
        severity: "opportunity",
        title: "Recompensa no compensa friccion",
        type: "economy",
      });
    }
  }

  for (let index = 1; index < nodeCards.length; index += 1) {
    const previous = nodeCards[index - 1];
    const current = nodeCards[index];
    if (current.reward_pressure + 25 < previous.reward_pressure && current.node_index > previous.node_index) {
      pushRecommendation(current, {
        action: "Suavizar la curva: evitar que un nodo posterior pague claramente menos que el anterior.",
        confidence: 70,
        detail: `${current.title} baja de ${previous.reward_pressure} a ${current.reward_pressure} en presion de recompensa.`,
        severity: "opportunity",
        title: "Curva de recompensa con caida",
        type: "economy",
      });
    }
  }

  const nodesWithSignal = nodeCards.filter((card) => card.run_count >= 3).length;
  const coldNodes = nodeCards.filter((card) => card.run_count === 0 && card.progress_completions === 0).length;
  const avgCompletion = nodesWithSignal
    ? round(nodeCards.filter((card) => card.run_count >= 3).reduce((sum, card) => sum + card.completion_rate_pct, 0) / nodesWithSignal)
    : 0;
  const avgStarRate = nodesWithSignal
    ? round(nodeCards.filter((card) => card.run_count >= 3).reduce((sum, card) => sum + card.star_rate_pct, 0) / nodesWithSignal)
    : 0;
  const rewardClaims = nodeCards.reduce((sum, card) => sum + card.claims, 0);
  const goldAwarded = nodeCards.reduce((sum, card) => sum + card.gold_awarded, 0);
  const xpAwarded = nodeCards.reduce((sum, card) => sum + card.xp_awarded, 0);
  const avgRewardPressure = nodeCards.length
    ? round(nodeCards.reduce((sum, card) => sum + card.reward_pressure, 0) / nodeCards.length)
    : 0;
  const economySpread = nodeCards.length
    ? Math.max(...nodeCards.map((card) => card.reward_pressure)) - Math.min(...nodeCards.map((card) => card.reward_pressure))
    : 0;
  const highFrictionNodes = nodeCards.filter((card) => card.run_count >= 3 && card.friction_score > 65).length;
  const easyNodes = nodeCards.filter((card) => card.run_count >= 3 && card.completion_rate_pct > 85).length;

  const economyPosture: WorldOpsPayload["balance"]["health"]["economy_posture"] =
    rewardClaims < 3
      ? "insufficient_data"
      : economySpread > 95
        ? "volatile"
        : avgRewardPressure > 135
          ? "generous"
          : avgRewardPressure < 75
            ? "lean"
            : "balanced";
  const difficultyPosture: WorldOpsPayload["balance"]["health"]["difficulty_posture"] =
    nodesWithSignal === 0
      ? "insufficient_data"
      : highFrictionNodes >= 2
        ? "spiky"
        : easyNodes >= Math.max(2, Math.ceil(nodesWithSignal / 2))
          ? "undertuned"
          : "smooth";

  return {
    health: {
      active_nodes: nodeCards.length,
      avg_completion_pct: avgCompletion,
      avg_star_rate_pct: avgStarRate,
      cold_nodes: coldNodes,
      difficulty_posture: difficultyPosture,
      economy_posture: economyPosture,
      gold_per_completion: rewardClaims ? round(goldAwarded / rewardClaims, 2) : 0,
      nodes_with_signal: nodesWithSignal,
      reward_pressure: avgRewardPressure,
      xp_per_completion: rewardClaims ? round(xpAwarded / rewardClaims, 2) : 0,
    },
    node_cards: nodeCards
      .sort((a, b) => {
        const severityA = a.friction_score + a.avg_risk + Math.abs(a.reward_pressure - 100) * 0.4;
        const severityB = b.friction_score + b.avg_risk + Math.abs(b.reward_pressure - 100) * 0.4;
        return severityB - severityA;
      })
      .slice(0, 10),
    recommendations: recommendations
      .sort((a, b) => {
        const severity = { critical: 3, warning: 2, opportunity: 1 };
        return severity[b.severity] - severity[a.severity] || b.confidence - a.confidence;
      })
      .slice(0, 9),
    reward_curve: nodeCards
      .slice()
      .sort((a, b) => a.node_index - b.node_index)
      .map((card) => ({
        avg_stars: card.avg_stars,
        completion_rate_pct: card.completion_rate_pct,
        node_index: card.node_index,
        reward_gold: card.reward_gold,
        reward_pressure: card.reward_pressure,
        reward_xp: card.reward_xp,
        title: card.title,
      })),
  };
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

  const [runsResult, rewardsResult, nodesResult, progressResult] = await Promise.all([
    supabase
      .from("world_game_runs")
      .select(
        "id,player_id,node_id,game,status,started_at,expires_at,completed_at,score,stars,attempt_hash,validation_risk,validation_flags,client_elapsed_ms"
      )
      .gte("started_at", sinceIso)
      .order("started_at", { ascending: false })
      .limit(limit),
    supabase
      .from("world_node_reward_claims")
      .select("node_id,created_at,xp_awarded,gold_awarded,star_delta")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("world_nodes")
      .select("id,world_id,node_index,node_type,title,target_ref,reward_xp,reward_gold,max_stars,active")
      .eq("active", true)
      .order("world_id", { ascending: true })
      .order("node_index", { ascending: true })
      .limit(500),
    supabase
      .from("player_world_progress")
      .select("player_id,node_id,completed,stars,best_score")
      .eq("completed", true)
      .limit(5000),
  ]);

  if (runsResult.error) {
    throw new Error("world_runs_query_failed");
  }
  if (rewardsResult.error) {
    throw new Error("world_rewards_query_failed");
  }
  if (nodesResult.error) {
    throw new Error("world_nodes_query_failed");
  }
  if (progressResult.error) {
    throw new Error("world_progress_query_failed");
  }

  const runs = (Array.isArray(runsResult.data) ? runsResult.data : []) as RunRow[];
  const rewards = (Array.isArray(rewardsResult.data) ? rewardsResult.data : []) as RewardRow[];
  const nodes = (Array.isArray(nodesResult.data) ? nodesResult.data : []) as NodeRow[];
  const progress = (Array.isArray(progressResult.data) ? progressResult.data : []) as ProgressRow[];
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
    balance: buildBalance({ nodes, progress, rewards, runs }),
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
