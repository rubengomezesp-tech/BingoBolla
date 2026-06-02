import {
  apiError,
  isRecord,
  UUID_RE,
} from "@/lib/server/api";
import type {
  WorldOpsPayload,
  WorldTuningAuditEntry,
  WorldTuningImpact,
  WorldTuningScalarSet,
} from "@/lib/world/ops-types";

const NODE_SELECT =
  "id,world_id,node_index,node_type,title,target_ref,reward_xp,reward_gold,max_stars,active";
const MAX_XP = 5000;
const MAX_GOLD = 1_000_000;
const MAX_REASON_LENGTH = 240;

type SupabaseLike = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
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

type AuditRow = {
  action?: unknown;
  after_values?: unknown;
  before_values?: unknown;
  created_at?: unknown;
  id?: unknown;
  node_id?: unknown;
  reason?: unknown;
  world_id?: unknown;
};

type ParsedTuningRequest = {
  action: "preview" | "apply";
  maxStars: number;
  nodeId: string;
  reason: string;
  rewardGold: number;
  rewardXp: number;
};

export type WorldTuningResult =
  | { ok: true; impact: WorldTuningImpact }
  | { ok: false; response: ReturnType<typeof apiError> };

export type WorldTuningApplyResult =
  | {
      ok: true;
      audit: unknown;
      history: WorldTuningAuditEntry[];
      impact: WorldTuningImpact;
      ops: WorldOpsPayload;
    }
  | { ok: false; response: ReturnType<typeof apiError> };

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown) {
  return value === true;
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function boundedInt(value: unknown, min: number, max: number) {
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const next = Math.trunc(parsed);
  if (next < min || next > max) return null;
  return next;
}

function median(values: number[], fallback = 1) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return fallback;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function gameForTarget(targetRef: unknown, nodeType: unknown) {
  const ref = text(targetRef).toLowerCase();
  const type = text(nodeType).toLowerCase();
  if (ref.includes("neural") || ref.includes("boss")) return "neural_cascade";
  if (ref.includes("ball") || ref.includes("bolla") || ref.includes("numbers")) return "ballmatch";
  if (type === "boss") return "neural_cascade";
  if (type === "minigame") return "ballmatch";
  return "world";
}

function normalizeReason(value: unknown) {
  return text(value).replace(/\s+/g, " ").trim().slice(0, MAX_REASON_LENGTH);
}

function parseTuningRequest(body: Record<string, unknown>): ParsedTuningRequest | null {
  const action = body.action === "apply" ? "apply" : body.action === "preview" ? "preview" : null;
  const nodeId = text(body.node_id).trim();
  const rewardXp = boundedInt(body.reward_xp, 0, MAX_XP);
  const rewardGold = boundedInt(body.reward_gold, 0, MAX_GOLD);
  const maxStars = boundedInt(body.max_stars, 1, 3);

  if (!action || !UUID_RE.test(nodeId) || rewardXp === null || rewardGold === null || maxStars === null) {
    return null;
  }

  return {
    action,
    maxStars,
    nodeId,
    reason: normalizeReason(body.reason),
    rewardGold,
    rewardXp,
  };
}

function scalarSet({
  goldPerStarMedian,
  maxStars,
  rewardGold,
  rewardXp,
  xpPerStarMedian,
}: {
  goldPerStarMedian: number;
  maxStars: number;
  rewardGold: number;
  rewardXp: number;
  xpPerStarMedian: number;
}): WorldTuningScalarSet {
  const stars = Math.max(1, maxStars);
  const goldPerStar = rewardGold / stars;
  const xpPerStar = rewardXp / stars;

  return {
    gold_per_star: round(goldPerStar, 2),
    max_stars: stars,
    reward_gold: rewardGold,
    reward_pressure: round(((goldPerStar / goldPerStarMedian) + (xpPerStar / xpPerStarMedian)) * 50, 0),
    reward_xp: rewardXp,
    xp_per_star: round(xpPerStar, 2),
  };
}

function buildGuardrails(before: WorldTuningScalarSet, after: WorldTuningScalarSet) {
  const guardrails: WorldTuningImpact["guardrails"] = [];
  const rewardPressureDelta = after.reward_pressure - before.reward_pressure;
  const rewardPct = before.reward_pressure > 0 ? Math.abs(rewardPressureDelta / before.reward_pressure) * 100 : 0;

  if (after.reward_pressure >= 170) {
    guardrails.push({
      detail: "El nodo queda en payout muy alto contra la mediana del mundo.",
      label: "Payout extremo",
      tone: "danger",
    });
  } else if (after.reward_pressure >= 140) {
    guardrails.push({
      detail: "Premio atractivo; conviene monitorizar conversion y riesgo tras publicar.",
      label: "Payout generoso",
      tone: "watch",
    });
  }

  if (after.reward_pressure <= 55) {
    guardrails.push({
      detail: "La recompensa podria sentirse seca si el nodo tiene friccion.",
      label: "Payout bajo",
      tone: "watch",
    });
  }

  if (rewardPct >= 45) {
    guardrails.push({
      detail: `Cambio de presion ${round(rewardPct, 0)}%; mejor aplicar y observar en una ventana corta.`,
      label: "Cambio grande",
      tone: rewardPct >= 80 ? "danger" : "watch",
    });
  }

  if (after.max_stars < before.max_stars) {
    guardrails.push({
      detail: "Reduce techo de maestria; util para onboarding, menos para competicion.",
      label: "Mastery mas suave",
      tone: "watch",
    });
  }

  if (after.max_stars > before.max_stars) {
    guardrails.push({
      detail: "Sube techo de estrellas; revisar que el minijuego emite ese maximo.",
      label: "Mastery mas exigente",
      tone: "watch",
    });
  }

  if (guardrails.length === 0) {
    guardrails.push({
      detail: "El ajuste se mantiene dentro de rangos normales para el mundo actual.",
      label: "Rango sano",
      tone: "safe",
    });
  }

  return guardrails;
}

function buildImpact(request: ParsedTuningRequest, node: NodeRow, worldNodes: NodeRow[]): WorldTuningImpact {
  const benchmarkNodes = worldNodes.length > 0 ? worldNodes : [node];
  const goldPerStarMedian = median(
    benchmarkNodes.map((item) => num(item.reward_gold) / Math.max(1, int(item.max_stars, 3))),
    100
  );
  const xpPerStarMedian = median(
    benchmarkNodes.map((item) => int(item.reward_xp) / Math.max(1, int(item.max_stars, 3))),
    25
  );
  const before = scalarSet({
    goldPerStarMedian,
    maxStars: int(node.max_stars, 3),
    rewardGold: num(node.reward_gold),
    rewardXp: int(node.reward_xp),
    xpPerStarMedian,
  });
  const after = scalarSet({
    goldPerStarMedian,
    maxStars: request.maxStars,
    rewardGold: request.rewardGold,
    rewardXp: request.rewardXp,
    xpPerStarMedian,
  });
  const changedFields: WorldTuningImpact["changed_fields"] = [];

  if (before.reward_xp !== after.reward_xp) changedFields.push("reward_xp");
  if (before.reward_gold !== after.reward_gold) changedFields.push("reward_gold");
  if (before.max_stars !== after.max_stars) changedFields.push("max_stars");

  return {
    after,
    before,
    changed_fields: changedFields,
    delta: {
      gold_per_star: round(after.gold_per_star - before.gold_per_star, 2),
      max_stars: after.max_stars - before.max_stars,
      reward_gold: after.reward_gold - before.reward_gold,
      reward_pressure: after.reward_pressure - before.reward_pressure,
      reward_pressure_pct: before.reward_pressure > 0
        ? round(((after.reward_pressure - before.reward_pressure) / before.reward_pressure) * 100, 1)
        : 0,
      reward_xp: after.reward_xp - before.reward_xp,
      xp_per_star: round(after.xp_per_star - before.xp_per_star, 2),
    },
    game: gameForTarget(node.target_ref, node.node_type),
    guardrails: buildGuardrails(before, after),
    node_id: text(node.id),
    node_index: int(node.node_index),
    node_type: text(node.node_type),
    reason: request.reason,
    title: text(node.title),
    world_id: text(node.world_id),
  };
}

async function loadNodeContext(supabase: SupabaseLike, nodeId: string) {
  const { data: node, error: nodeError } = await supabase
    .from("world_nodes")
    .select(NODE_SELECT)
    .eq("id", nodeId)
    .single();

  if (nodeError || !node) return { error: "node_not_found" as const };

  const worldId = text((node as NodeRow).world_id);
  const { data: worldNodes, error: nodesError } = await supabase
    .from("world_nodes")
    .select("id,reward_xp,reward_gold,max_stars")
    .eq("world_id", worldId)
    .eq("active", true)
    .order("node_index", { ascending: true })
    .limit(500);

  if (nodesError) return { error: "world_nodes_context_failed" as const };

  return {
    node: node as NodeRow,
    worldNodes: (Array.isArray(worldNodes) ? worldNodes : []) as NodeRow[],
  };
}

function auditNodeValues(value: unknown): WorldTuningAuditEntry["before"] | WorldTuningAuditEntry["after"] {
  const row = isRecord(value) ? value : {};
  const stars = Math.max(1, int(row.max_stars, 3));
  const rewardGold = num(row.reward_gold);
  const rewardXp = int(row.reward_xp);

  return {
    active: bool(row.active),
    gold_per_star: round(rewardGold / stars, 2),
    max_stars: stars,
    node_index: int(row.node_index),
    node_type: text(row.node_type),
    reward_gold: rewardGold,
    reward_xp: rewardXp,
    target_ref: text(row.target_ref) || null,
    title: text(row.title),
    world_id: text(row.world_id),
    xp_per_star: round(rewardXp / stars, 2),
  };
}

function normalizeAuditRow(row: AuditRow): WorldTuningAuditEntry {
  return {
    action: "apply",
    after: auditNodeValues(row.after_values),
    before: auditNodeValues(row.before_values),
    created_at: text(row.created_at),
    id: text(row.id),
    node_id: text(row.node_id),
    reason: text(row.reason),
    world_id: text(row.world_id),
  };
}

export async function loadWorldTuningHistory(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("world_node_tuning_audit")
    .select("id,node_id,world_id,action,reason,before_values,after_values,created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error("world_tuning_history_failed");
  }

  return ((Array.isArray(data) ? data : []) as AuditRow[]).map(normalizeAuditRow);
}

export async function previewWorldNodeTuning(
  supabase: SupabaseLike,
  body: Record<string, unknown>
): Promise<WorldTuningResult> {
  const request = parseTuningRequest(body);
  if (!request) return { ok: false, response: apiError("invalid_tuning", 400) };

  const context = await loadNodeContext(supabase, request.nodeId);
  if ("error" in context) {
    return { ok: false, response: apiError(context.error ?? "world_nodes_context_failed", 400) };
  }

  const impact = buildImpact(request, context.node, context.worldNodes);
  if (impact.changed_fields.length === 0) return { ok: false, response: apiError("no_changes", 400) };

  return { ok: true, impact };
}

export async function applyWorldNodeTuning({
  body,
  loadOps,
  supabase,
  userId,
  window,
}: {
  body: Record<string, unknown>;
  loadOps: () => Promise<WorldOpsPayload>;
  supabase: SupabaseLike;
  userId: string;
  window: WorldOpsPayload["window"];
}): Promise<WorldTuningApplyResult> {
  const request = parseTuningRequest(body);
  if (!request) return { ok: false, response: apiError("invalid_tuning", 400) };
  if (request.action !== "apply") return { ok: false, response: apiError("invalid_tuning_action", 400) };
  if (request.reason.length < 8) return { ok: false, response: apiError("reason_required", 400) };

  const preview = await previewWorldNodeTuning(supabase, body);
  if (!preview.ok) return preview;

  const { data, error } = await supabase.rpc("service_admin_apply_world_node_tuning", {
    p_actor_id: userId,
    p_expected_max_stars: preview.impact.before.max_stars,
    p_expected_reward_gold: preview.impact.before.reward_gold,
    p_expected_reward_xp: preview.impact.before.reward_xp,
    p_impact_preview: preview.impact,
    p_max_stars: request.maxStars,
    p_node_id: request.nodeId,
    p_reason: request.reason,
    p_reward_gold: request.rewardGold,
    p_reward_xp: request.rewardXp,
  });

  if (error) {
    console.error("[admin.world-tuning.apply]", error);
    return { ok: false, response: apiError("world_tuning_apply_failed", 500) };
  }

  if (isRecord(data) && typeof data.error === "string") {
    return { ok: false, response: apiError(data.error, data.error === "forbidden" ? 403 : 400) };
  }

  const [ops, history] = await Promise.all([
    loadOps(),
    loadWorldTuningHistory(supabase),
  ]);

  return {
    audit: data,
    history,
    impact: preview.impact,
    ok: true,
    ops: { ...ops, window },
  };
}
