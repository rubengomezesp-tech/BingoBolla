// BingoBolla — Caller Worker
// Runs locally: node scripts/caller.mjs
// Polls active games every second and calls balls per room interval.
// Later: deploy to Railway / Fly.io as a long-running service.

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const TICK = 1000; // poll every 1s
const lastCall = new Map(); // game_id -> timestamp

console.log("🎯 BingoBolla caller worker started");

async function tick() {
  // 1. Auto-start games that are waiting and have at least 1 card and starts_at passed
  const { data: toStart } = await sb
    .from("games")
    .select("id, room_id, starts_at, rooms(ball_interval_ms)")
    .eq("status", "waiting")
    .lte("starts_at", new Date().toISOString());

  if (toStart) {
    for (const g of toStart) {
      const { count } = await sb
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("game_id", g.id);
      if ((count ?? 0) >= 1) {
        await sb.rpc("start_game", { p_game_id: g.id });
        console.log(`▶  started game ${g.id} (${count} cards)`);
      }
    }
  }

  // 2. Call next ball for active games whose interval has elapsed
  const { data: active } = await sb
    .from("games")
    .select("id, room_id, rooms(ball_interval_ms, name)")
    .eq("status", "playing");

  if (!active) return;

  for (const g of active) {
    const interval = g.rooms?.ball_interval_ms ?? 3000;
    const last = lastCall.get(g.id) ?? 0;
    if (Date.now() - last < interval) continue;

    const { data, error } = await sb.rpc("call_next_ball", { p_game_id: g.id });
    if (error) {
      console.error(`✗ ${g.rooms?.name}:`, error.message);
      continue;
    }
    if (data?.finished) {
      console.log(`✓ ${g.rooms?.name} finished`);
      lastCall.delete(g.id);
    } else if (data?.ball) {
      console.log(`🎱 ${g.rooms?.name}: ball ${data.ball} (#${data.sequence})`);
      lastCall.set(g.id, Date.now());
    }
  }
}

setInterval(() => {
  tick().catch(e => console.error("tick error:", e.message));
}, TICK);
