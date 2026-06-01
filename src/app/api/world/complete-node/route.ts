import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RUN_TOKEN_RE,
  UUID_RE,
  WORLD_ID,
  constantTimeEqual,
  createAdminClient,
  explicitGameForTarget,
  hashRunToken,
  isAllowedGame,
  isMissingGameRunsTableError,
  isRecord,
  shouldRequireGameRun,
  validateWorldGameResult,
} from "@/lib/world/game-runs";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
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

    const runId = typeof body.run_id === "string" ? body.run_id : "";
    const runToken = typeof body.run_token === "string" ? body.run_token : "";
    const hasRunCredentials = Boolean(runId || runToken);
    if (hasRunCredentials && (!UUID_RE.test(runId) || !RUN_TOKEN_RE.test(runToken))) {
      return jsonError("invalid_run", 400);
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
      return jsonError("server_not_configured", 500);
    }
    if (requireRun && !hasRunCredentials) {
      return jsonError("run_required", 428);
    }
    const db = adminDb;

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

    let runValidated = false;
    let runGame: string | null = null;

    if (hasRunCredentials && adminDb) {
      const { data: run, error: runError } = await adminDb
        .from("world_game_runs")
        .select("id,game,status,expires_at,token_hash")
        .eq("id", runId)
        .eq("player_id", user.id)
        .eq("node_id", nodeId)
        .maybeSingle();

      if (runError) {
        if (!(isMissingGameRunsTableError(runError) && !requireRun)) {
          console.error("world_game_runs lookup failed:", runError);
          return jsonError("run_check_failed", 500);
        }
      } else {
        if (!run) {
          return jsonError("run_not_found", 404);
        }

        runGame = String((run as any).game ?? "");
        if ((run as any).status !== "started") {
          return jsonError("run_not_open", 409);
        }
        if (game && runGame !== game) {
          return jsonError("game_node_mismatch", 409);
        }

        const expiresAt = Date.parse(String((run as any).expires_at ?? ""));
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          await adminDb
            .from("world_game_runs")
            .update({ status: "expired" })
            .eq("id", runId)
            .eq("status", "started");
          return jsonError("run_expired", 409);
        }

        const tokenHash = await hashRunToken(runToken);
        if (!constantTimeEqual(tokenHash, String((run as any).token_hash ?? ""))) {
          return jsonError("run_invalid", 403);
        }

        runValidated = true;
      }
    }

    const effectiveGame = game;
    const explicitGame = explicitGameForTarget(node.target_ref);
    if (explicitGame && effectiveGame !== explicitGame) {
      return jsonError("game_node_mismatch", 409);
    }

    const resultValidation = validateWorldGameResult({ body, game: effectiveGame, node });
    if (!resultValidation.ok) {
      return jsonError(resultValidation.error, resultValidation.status);
    }

    const incomingStars = resultValidation.stars;
    const attemptScore = resultValidation.score;

    const { data: reward, error: rewardError } = await db.rpc("service_complete_world_node_reward", {
      p_actor_id: user.id,
      p_node_id: nodeId,
      p_run_id: runValidated ? runId : null,
      p_score: attemptScore,
      p_stars: incomingStars,
    });

    if (rewardError || !reward) {
      console.error("world node reward failed:", rewardError);
      return jsonError("progress_save_failed", 500);
    }

    const [nextMapResult, xpRowsResult] = await Promise.all([
      adminDb.rpc("service_get_world_map", {
        p_actor_id: user.id,
        p_world_id: WORLD_ID,
      }),
      adminDb.rpc("service_get_player_xp", {
        p_actor_id: user.id,
        p_player_id: user.id,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      node_id: nodeId,
      stars: Number((reward as any).stars ?? incomingStars),
      best_score: Number((reward as any).best_score ?? attemptScore),
      completed_first_time: Boolean((reward as any).completed_first_time),
      star_delta: Number((reward as any).star_delta ?? 0),
      xp_awarded: Number((reward as any).xp_awarded ?? 0),
      gold_awarded: Number((reward as any).gold_awarded ?? 0),
      new_gold_balance: Number((reward as any).new_gold_balance ?? 0),
      server_validated: true,
      run_validated: runValidated,
      run_id: runValidated ? runId : null,
      map: nextMapResult.data,
      xp: xpRowsResult.data,
    });
  } catch (err) {
    console.error("complete-node error:", err);
    return jsonError("unknown_error", 500);
  }
}
