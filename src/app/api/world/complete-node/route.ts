import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RUN_TOKEN_RE,
  UUID_RE,
  WORLD_ID,
  clampInt,
  constantTimeEqual,
  createAdminClient,
  explicitGameForTarget,
  hashRunToken,
  isAllowedGame,
  isMissingGameRunsTableError,
  isRecord,
  shouldRequireGameRun,
  validateWorldGameResult,
  xpForNodeCompletion,
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
    if (requireRun && !adminDb) {
      return jsonError("server_not_configured", 500);
    }
    if (requireRun && !hasRunCredentials) {
      return jsonError("run_required", 428);
    }
    const db = adminDb ?? sessionSupabase;

    const { data: mapRows, error: mapError } = await sessionSupabase.rpc("get_world_map", {
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

    const now = new Date().toISOString();
    const maxStars = clampInt(node.max_stars, 1, 3);
    const resultValidation = validateWorldGameResult({ body, game: effectiveGame, node });
    if (!resultValidation.ok) {
      return jsonError(resultValidation.error, resultValidation.status);
    }

    const incomingStars = resultValidation.stars;
    const attemptScore = resultValidation.score;
    const existingStars = clampInt(node.stars, 0, maxStars);
    const stars = Math.max(existingStars, incomingStars);

    if (runValidated && adminDb) {
      const { data: closedRun, error: runCloseError } = await adminDb
        .from("world_game_runs")
        .update({
          status: "completed",
          completed_at: now,
          score: attemptScore,
          stars: incomingStars,
        })
        .eq("id", runId)
        .eq("status", "started")
        .select("id")
        .maybeSingle();

      if (runCloseError || !closedRun) {
        console.error("world_game_runs close failed:", runCloseError);
        return jsonError("run_close_failed", 500);
      }
    }

    const { data: previous } = await db
      .from("player_world_progress")
      .select("best_score,completed_at")
      .eq("player_id", user.id)
      .eq("node_id", nodeId)
      .maybeSingle();

    const savedBestScore = Math.max(Number((previous as any)?.best_score ?? 0), attemptScore);

    const { error: progressError } = await db.from("player_world_progress").upsert(
      {
        player_id: user.id,
        node_id: nodeId,
        completed: true,
        stars,
        best_score: savedBestScore,
        completed_at: (previous as any)?.completed_at ?? now,
        updated_at: now,
      },
      { onConflict: "player_id,node_id" }
    );

    if (progressError) {
      console.error("player_world_progress upsert failed:", progressError);
      return jsonError("progress_save_failed", 500);
    }

    const firstCompletion = !(previous as any)?.completed_at;
    const xp = xpForNodeCompletion(node, incomingStars, firstCompletion);
    let xpErrorMessage: string | null = null;
    if (xp > 0) {
      const { error: xpError } = await db.rpc("add_xp", {
        p_player_id: user.id,
        p_amount: xp,
      });
      xpErrorMessage = xpError?.message ?? null;
    }

    const [{ data: nextMap }, { data: xpRows }] = await Promise.all([
      sessionSupabase.rpc("get_world_map", { p_world_id: WORLD_ID }),
      sessionSupabase.rpc("get_player_xp", { p_player_id: user.id }),
    ]);

    return NextResponse.json({
      ok: true,
      node_id: nodeId,
      stars,
      best_score: savedBestScore,
      completed_first_time: firstCompletion,
      xp_awarded: xp > 0 && !xpErrorMessage ? xp : 0,
      xp_error: xpErrorMessage ? "xp_award_failed" : null,
      server_validated: true,
      run_validated: runValidated,
      run_id: runValidated ? runId : null,
      map: nextMap,
      xp: xpRows,
    });
  } catch (err) {
    console.error("complete-node error:", err);
    return jsonError("unknown_error", 500);
  }
}
