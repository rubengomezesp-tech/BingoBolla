import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RUN_TTL_MS,
  UUID_RE,
  WORLD_ID,
  createAdminClient,
  explicitGameForTarget,
  generateRunToken,
  hashRunToken,
  isAllowedGame,
  isMissingGameRunsTableError,
  isRecord,
  safeHeader,
  shouldRequireGameRun,
} from "@/lib/world/game-runs";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function degradedRun(reason: string) {
  return NextResponse.json({
    ok: true,
    run_required: false,
    degraded: true,
    reason,
  });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return jsonError("invalid_json", 400);
    }

    const nodeId = String(body.node_id ?? "");
    if (!UUID_RE.test(nodeId)) {
      return jsonError("invalid_node_id", 400);
    }

    const game = typeof body.game === "string" ? body.game : "";
    if (!isAllowedGame(game)) {
      return jsonError("invalid_game", 400);
    }

    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await sessionSupabase.auth.getUser();

    if (userError || !user) {
      return jsonError("not_authenticated", 401);
    }

    const adminDb = createAdminClient();
    const requireRun = shouldRequireGameRun({ adminAvailable: Boolean(adminDb) });
    if (!adminDb) {
      if (!requireRun) return degradedRun("service_role_missing");
      return jsonError("server_not_configured", 500);
    }

    const { data: mapRows, error: mapError } = await adminDb.rpc("service_get_world_map", {
      p_actor_id: user.id,
      p_world_id: WORLD_ID,
    });
    if (mapError) {
      console.error("get_world_map failed:", mapError);
      return jsonError("map_load_failed", 500);
    }

    const map = Array.isArray(mapRows) ? mapRows : [];
    const node = map.find((row: Record<string, unknown>) => String(row.node_id) === nodeId);
    if (!node) {
      return jsonError("node_not_found", 404);
    }
    if (!node.unlocked && !node.completed) {
      return jsonError("node_locked", 403);
    }

    const explicitGame = explicitGameForTarget(node.target_ref);
    if (explicitGame && game !== explicitGame) {
      return jsonError("game_node_mismatch", 409);
    }

    const token = generateRunToken();
    const tokenHash = await hashRunToken(token);
    const expiresAt = new Date(Date.now() + RUN_TTL_MS).toISOString();

    const { error: cancelError } = await adminDb
      .from("world_game_runs")
      .update({ status: "cancelled" })
      .eq("player_id", user.id)
      .eq("node_id", nodeId)
      .eq("status", "started");

    if (cancelError) {
      if (isMissingGameRunsTableError(cancelError) && !requireRun) {
        return degradedRun("game_runs_table_missing");
      }

      console.error("world_game_runs cancel failed:", cancelError);
      return jsonError("run_start_failed", 500);
    }

    const { data: run, error: insertError } = await adminDb
      .from("world_game_runs")
      .insert({
        player_id: user.id,
        node_id: nodeId,
        world_id: WORLD_ID,
        game,
        status: "started",
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: safeHeader(request.headers.get("user-agent")),
      })
      .select("id,expires_at")
      .single();

    if (insertError) {
      if (isMissingGameRunsTableError(insertError) && !requireRun) {
        return degradedRun("game_runs_table_missing");
      }

      console.error("world_game_runs insert failed:", insertError);
      return jsonError("run_start_failed", 500);
    }

    return NextResponse.json({
      ok: true,
      run_required: true,
      degraded: false,
      run_id: run.id,
      run_token: token,
      expires_at: run.expires_at,
    });
  } catch (err) {
    console.error("start-node error:", err);
    return jsonError("unknown_error", 500);
  }
}
