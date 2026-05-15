// Client-driven game tick — every connected client calls this every 3s
// The SQL function rate-limits to prevent over-calling
// This way the game progresses as long as someone is watching, no 24/7 server needed

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { game_id } = await request.json();
    if (!game_id) return NextResponse.json({ error: "game_id required" }, { status: 400 });

    // Use service role for guaranteed write access (the function itself is security_definer)
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Try tick (for playing games)
    const { data: tickData, error: tickErr } = await sb.rpc("tick_game", { p_game_id: game_id });
    if (tickErr) return NextResponse.json({ error: tickErr.message }, { status: 500 });

    // If it's a waiting game, try starting it
    if (tickData?.status === "waiting") {
      const { data: startData } = await sb.rpc("tick_waiting_game", { p_game_id: game_id });
      return NextResponse.json({ ok: true, ...startData });
    }

    return NextResponse.json({ ok: true, ...tickData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
