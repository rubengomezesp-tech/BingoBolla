// Vercel Cron endpoint — runs every minute via vercel.json
// Drops balls, starts games, schedules rounds, posts MC messages
// NOTE: 1-min granularity is MVP. For smoother gameplay use Railway/Fly.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 50;  // Vercel hobby allows max 60s per function

const TICK_BATCH_SIZE = 20;     // Balls to drop per minute (since we run 1/min)
const MC_INTERVAL_MS = 60_000;
const GHOST_TIMEOUT_MS = 5 * 60_000;

const personasCache: any[] = [];
const lastMcAt = new Map<string, number>();

function hashSync(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return ("0000000000000000" + (h >>> 0).toString(16)).slice(-16);
}

export async function GET(request: Request) {
  // Auth: Vercel cron sends Authorization header with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const stats = { ballsDropped: 0, gamesStarted: 0, gamesCreated: 0, mcMessages: 0, ghostsCleared: 0 };

  try {
    // ============ 1. CLEANUP GHOST GAMES ============
    const cutoff = new Date(Date.now() - GHOST_TIMEOUT_MS).toISOString();
    const { data: stale } = await sb
      .from("games")
      .select("id")
      .eq("status", "waiting")
      .lt("created_at", cutoff);

    for (const g of stale ?? []) {
      const { count } = await sb.from("cards").select("*", { count: "exact", head: true }).eq("game_id", g.id);
      if ((count ?? 0) === 0) {
        await sb.from("games").delete().eq("id", g.id);
        stats.ghostsCleared++;
      }
    }

    // ============ 2. AUTO-START READY GAMES ============
    const { data: toStart } = await sb
      .from("games")
      .select("id, room_id, rooms(name)")
      .eq("status", "waiting")
      .lte("starts_at", new Date().toISOString());

    for (const g of toStart ?? []) {
      const { count } = await sb.from("cards").select("*", { count: "exact", head: true }).eq("game_id", g.id);
      if ((count ?? 0) >= 1) {
        await sb.rpc("start_game", { p_game_id: g.id });
        await postMcMessage(sb, g.id, "game_start");
        stats.gamesStarted++;
      } else {
        await sb.from("games").update({ starts_at: new Date(Date.now() + 30_000).toISOString() }).eq("id", g.id);
      }
    }

    // ============ 3. DROP BALLS IN PLAYING GAMES ============
    // Since cron runs 1/min, we drop multiple balls per call (catch-up mode)
    const { data: playing } = await sb
      .from("games")
      .select("id, room_id, rooms(name, ball_interval_ms)")
      .eq("status", "playing");

    for (const g of playing ?? []) {
      // Drop up to TICK_BATCH_SIZE balls; cron at 1/min and ~3s/ball means ~20 balls fit
      for (let i = 0; i < TICK_BATCH_SIZE; i++) {
        const { data, error } = await sb.rpc("call_next_ball", { p_game_id: g.id });
        if (error) break;
        if (data?.finished) break;
        if (data?.ball) stats.ballsDropped++;
        else break;
      }
    }

    // ============ 4. SCHEDULE NEW ROUNDS ============
    const { data: rooms } = await sb.from("rooms").select("*").eq("active", true);
    for (const room of rooms ?? []) {
      const { data: openGames } = await sb
        .from("games")
        .select("id")
        .eq("room_id", room.id)
        .in("status", ["waiting", "playing"]);

      if ((openGames?.length ?? 0) > 0) continue;

      const { data: lastFinished } = await sb
        .from("games")
        .select("ended_at, next_round_starts_at")
        .eq("room_id", room.id)
        .eq("status", "finished")
        .order("ended_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const intervalMs = (room.schedule_interval_seconds ?? 90) * 1000;
      const nextStart = lastFinished?.next_round_starts_at
        ? new Date(lastFinished.next_round_starts_at).getTime()
        : (lastFinished?.ended_at ? new Date(lastFinished.ended_at).getTime() + intervalMs : Date.now() + intervalMs);

      if (lastFinished && Date.now() < nextStart - intervalMs) continue;

      const { data: newGame } = await sb
        .from("games")
        .insert({
          room_id: room.id,
          status: "waiting",
          starts_at: new Date(Math.max(Date.now() + 60_000, nextStart)).toISOString(),
          seed_hash: hashSync(`${room.id}-${Date.now()}-${Math.random()}`),
        })
        .select()
        .single();

      if (newGame) {
        stats.gamesCreated++;
        await postMcMessage(sb, newGame.id, "game_waiting");
      }
    }

    // ============ 5. MC MESSAGES IN PLAYING ROOMS ============
    const now = Date.now();
    for (const g of playing ?? []) {
      const last = lastMcAt.get(g.id) ?? 0;
      if (now - last < MC_INTERVAL_MS) continue;
      lastMcAt.set(g.id, now);
      await postMcMessage(sb, g.id, "idle");
      stats.mcMessages++;
    }

    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function loadPersonas(sb: any) {
  if (personasCache.length) return personasCache;
  const { data } = await sb.from("mc_personas").select("*").eq("active", true);
  if (data) personasCache.push(...data);
  return personasCache;
}

async function postMcMessage(sb: any, gameId: string, triggerType: string) {
  const personas = await loadPersonas(sb);
  if (personas.length === 0) return;
  const persona = personas[Math.floor(Math.random() * personas.length)];
  const { data: msgs } = await sb.from("mc_messages_pool").select("*").eq("trigger_type", triggerType);
  if (!msgs || msgs.length === 0) return;
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  await sb.from("chat_messages").insert({
    game_id: gameId,
    player_id: null,
    is_mc: true,
    message: `${persona.emoji} ${persona.name}: ${msg.message}`,
  });
}
