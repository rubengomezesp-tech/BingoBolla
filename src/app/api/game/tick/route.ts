import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_not_configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const authError = authorizeCron(request);
    if (authError) return authError;

    const body: unknown = await request.json().catch(() => null);
    const gameId = body && typeof body === "object" && "game_id" in body ? String((body as any).game_id) : "";
    if (!UUID_RE.test(gameId)) {
      return NextResponse.json({ ok: false, error: "invalid_game_id" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 500 });
    }

    const sb = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const { data, error } = await sb.rpc("tick_game", { p_game_id: gameId });

    if (error) {
      console.warn("tick_game RPC error:", error.message);
      return NextResponse.json({ ok: false, error: "tick_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    console.warn("tick endpoint error:", err?.message);
    return NextResponse.json({ ok: false, error: "unknown_error" }, { status: 500 });
  }
}
