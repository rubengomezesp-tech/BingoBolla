import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function clampInt(value: unknown, min: number, max: number) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nodeId = String(body?.node_id ?? "");
    if (!nodeId) {
      return NextResponse.json({ error: "node_id_required" }, { status: 400 });
    }

    const sessionSupabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await sessionSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = serviceKey
      ? createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
          auth: { persistSession: false },
        })
      : sessionSupabase;

    const { data: mapRows, error: mapError } = await sessionSupabase.rpc("get_world_map", {
      p_world_id: "miami_nights",
    });
    if (mapError) {
      return NextResponse.json({ error: mapError.message }, { status: 500 });
    }

    const map = Array.isArray(mapRows) ? mapRows : [];
    const node = map.find((row: any) => String(row.node_id) === nodeId);
    if (!node) {
      return NextResponse.json({ error: "node_not_found" }, { status: 404 });
    }
    if (!node.unlocked && !node.completed) {
      return NextResponse.json({ error: "node_locked" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const incomingStars = clampInt(body?.stars, 0, Number(node.max_stars ?? 3));
    const existingStars = clampInt(node.stars, 0, Number(node.max_stars ?? 3));
    const stars = Math.max(existingStars, incomingStars);
    const bestScore = Math.max(0, clampInt(body?.score, 0, 2_000_000_000));
    const xp = Math.max(0, Math.min(5000, clampInt(body?.xp ?? node.reward_xp, 0, 5000)));

    const { data: previous } = await db
      .from("player_world_progress")
      .select("best_score,completed_at")
      .eq("player_id", user.id)
      .eq("node_id", nodeId)
      .maybeSingle();

    const { error: progressError } = await db.from("player_world_progress").upsert(
      {
        player_id: user.id,
        node_id: nodeId,
        completed: true,
        stars,
        best_score: Math.max(Number((previous as any)?.best_score ?? 0), bestScore),
        completed_at: (previous as any)?.completed_at ?? now,
        updated_at: now,
      },
      { onConflict: "player_id,node_id" }
    );

    if (progressError) {
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    let xpErrorMessage: string | null = null;
    if (xp > 0 && !(previous as any)?.completed_at) {
      const { error: xpError } = await db.rpc("add_xp", {
        p_player_id: user.id,
        p_amount: xp,
      });
      xpErrorMessage = xpError?.message ?? null;
    }

    const [{ data: nextMap }, { data: xpRows }] = await Promise.all([
      sessionSupabase.rpc("get_world_map", { p_world_id: "miami_nights" }),
      sessionSupabase.rpc("get_player_xp", { p_player_id: user.id }),
    ]);

    return NextResponse.json({
      ok: true,
      node_id: nodeId,
      stars,
      xp_awarded: xp > 0 && !(previous as any)?.completed_at && !xpErrorMessage ? xp : 0,
      xp_error: xpErrorMessage,
      map: nextMap,
      xp: xpRows,
    });
  } catch (err: any) {
    console.error("complete-node error:", err);
    return NextResponse.json({ error: err?.message ?? "unknown_error" }, { status: 500 });
  }
}
