import { NextResponse } from "next/server";
import { UUID_RE, apiError, readJsonRecord, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  try {
    const body = await readJsonRecord(request);
    if (!body) return apiError("invalid_json", 400);

    const gameId = String(body.game_id ?? "");
    if (!UUID_RE.test(gameId)) {
      return NextResponse.json({ ok: false, error: "invalid_game_id" }, { status: 400 });
    }

    const service = requireServiceClient();
    if ("error" in service) return service.error;

    const sb = service.supabase;

    const cronAuthorized = isAuthorizedCron(request);
    if (!cronAuthorized) {
      const auth = await requireAuthenticatedUser();
      if ("error" in auth) return auth.error;

      const { count, error: cardError } = await sb
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("player_id", auth.user.id);

      if (cardError) return apiError("tick_access_failed", 500);
      if ((count ?? 0) < 1) return apiError("not_in_game", 403);
    }

    const { data: game, error: gameError } = await sb
      .from("games")
      .select("id, status")
      .eq("id", gameId)
      .maybeSingle();

    if (gameError) {
      return NextResponse.json({ ok: false, error: "game_lookup_failed" }, { status: 500 });
    }
    if (!game) {
      return NextResponse.json({ ok: false, error: "game_not_found" }, { status: 404 });
    }

    const rpc = game.status === "waiting" ? "tick_waiting_game" : "tick_game";
    const { data, error } = await sb.rpc(rpc, { p_game_id: gameId });

    if (error) {
      console.warn(`${rpc} RPC error:`, error.message);
      return NextResponse.json({ ok: false, error: "tick_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    console.warn("tick endpoint error:", err?.message);
    return NextResponse.json({ ok: false, error: "unknown_error" }, { status: 500 });
  }
}
