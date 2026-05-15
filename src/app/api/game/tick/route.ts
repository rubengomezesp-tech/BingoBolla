import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { game_id } = await request.json();
    if (!game_id) {
      return NextResponse.json({ ok: false, error: "game_id required" });
    }

    // Service role: tick_game es security_definer pero usamos service role
    // para garantizar que siempre puede escribir aunque la sesión expire
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // tick_game maneja TODO internamente:
    // - Si waiting + starts_at pasó + hay cartones → arranca (status playing)
    // - Si playing → sortea siguiente bola (rate-limited)
    // - Si no toca todavía → throttled
    const { data, error } = await sb.rpc("tick_game", { p_game_id: game_id });

    if (error) {
      console.warn("tick_game RPC error:", error.message);
      // Devolvemos 200 con error en body para NO spammear la consola del navegador
      return NextResponse.json({ ok: false, error: error.message });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    console.warn("tick endpoint error:", err?.message);
    return NextResponse.json({ ok: false, error: err?.message ?? "unknown" });
  }
}
