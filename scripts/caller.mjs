// BingoBolla Caller v8 — Fixed scheduling, cleanup, better logging
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TICK_MS = 1000;
const SCHED_INTERVAL_MS = 10_000;
const MC_INTERVAL_MS = 45_000;
const GHOST_TIMEOUT_MS = 5 * 60_000; // waiting games with 0 cards older than 5 min → delete

let lastSched = 0;
const lastBallAt = new Map();
const lastMcAt = new Map();
const personasCache = [];

console.log("🎯 BingoBolla caller v8 started");

// ------------ MC HELPERS ------------
async function loadPersonas() {
  if (personasCache.length) return personasCache;
  const { data } = await sb.from("mc_personas").select("*").eq("active", true);
  if (data) personasCache.push(...data);
  return personasCache;
}
async function pickMcMessage(triggerType) {
  const { data } = await sb.from("mc_messages_pool").select("*").eq("trigger_type", triggerType);
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)];
}
async function postMcMessage(gameId, triggerType) {
  const personas = await loadPersonas();
  if (personas.length === 0) return;
  const persona = personas[Math.floor(Math.random() * personas.length)];
  const msg = await pickMcMessage(triggerType);
  if (!msg) return;
  await sb.from("chat_messages").insert({
    game_id: gameId,
    player_id: null,
    is_mc: true,
    message: `${persona.emoji} ${persona.name}: ${msg.message}`,
  });
}

// ------------ CLEANUP ------------
async function cleanupGhostGames() {
  // Delete waiting games with 0 cards older than 5 minutes
  const cutoff = new Date(Date.now() - GHOST_TIMEOUT_MS).toISOString();
  const { data: stale, error } = await sb
    .from("games")
    .select("id, room_id")
    .eq("status", "waiting")
    .lt("created_at", cutoff);
  if (error) {
    console.error("ghost query err:", error.message);
    return 0;
  }
  if (!stale || stale.length === 0) return 0;

  let deleted = 0;
  for (const g of stale) {
    const { count } = await sb.from("cards").select("*", { count: "exact", head: true }).eq("game_id", g.id);
    if ((count ?? 0) === 0) {
      const { error: delErr } = await sb.from("games").delete().eq("id", g.id);
      if (!delErr) deleted++;
    }
  }
  if (deleted > 0) console.log(`🧹 cleaned ${deleted} ghost games`);
  return deleted;
}

// ------------ SCHEDULING ------------
async function ensureScheduledRounds() {
  const { data: rooms, error: roomsErr } = await sb.from("rooms").select("*").eq("active", true);
  if (roomsErr) {
    console.error("rooms query err:", roomsErr.message);
    return;
  }
  if (!rooms) return;

  for (const room of rooms) {
    // CRITICAL: check open games with explicit error handling
    const { data: openGames, error: openErr } = await sb
      .from("games")
      .select("id, status, starts_at")
      .eq("room_id", room.id)
      .in("status", ["waiting", "playing"]);

    if (openErr) {
      console.error(`[${room.name}] open query err:`, openErr.message);
      continue;
    }
    if ((openGames?.length ?? 0) > 0) continue;  // Already has open game, skip

    // No open game — check when last one ended
    const { data: lastFinished } = await sb
      .from("games")
      .select("ended_at, next_round_starts_at")
      .eq("room_id", room.id)
      .eq("status", "finished")
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const intervalMs = (room.schedule_interval_seconds ?? 90) * 1000;
    const lastEnded = lastFinished?.ended_at ? new Date(lastFinished.ended_at).getTime() : 0;
    const nextStart = lastFinished?.next_round_starts_at
      ? new Date(lastFinished.next_round_starts_at).getTime()
      : lastEnded + intervalMs;

    if (lastFinished && Date.now() < nextStart - intervalMs) continue; // not time yet

    const seed = `${room.id}-${Date.now()}-${Math.random()}`;
    const { data: newGame, error: insErr } = await sb
      .from("games")
      .insert({
        room_id: room.id,
        status: "waiting",
        starts_at: new Date(Math.max(Date.now() + 30_000, nextStart)).toISOString(),
        seed_hash: hashSync(seed),
      })
      .select()
      .single();

    if (insErr) {
      console.error(`[${room.name}] insert err:`, insErr.message);
      continue;
    }
    if (newGame) {
      console.log(`📅 ${room.name}: new round (starts in 30s)`);
      await postMcMessage(newGame.id, "game_waiting");
    }
  }
}

function hashSync(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return ("0000000000000000" + (h >>> 0).toString(16)).slice(-16);
}

// ------------ MAIN TICK ------------
async function tick() {
  // 1) Auto-start waiting games whose starts_at passed AND have ≥1 card
  const { data: toStart } = await sb
    .from("games")
    .select("id, room_id, starts_at, rooms(name)")
    .eq("status", "waiting")
    .lte("starts_at", new Date().toISOString());

  for (const g of toStart ?? []) {
    const { count } = await sb.from("cards").select("*", { count: "exact", head: true }).eq("game_id", g.id);
    if ((count ?? 0) >= 1) {
      await sb.rpc("start_game", { p_game_id: g.id });
      await postMcMessage(g.id, "game_start");
      console.log(`▶ ${g.rooms?.name}: started (${count} cards)`);
    } else {
      // No players — push start time forward by 30s
      const newStarts = new Date(Date.now() + 30_000).toISOString();
      await sb.from("games").update({ starts_at: newStarts }).eq("id", g.id);
    }
  }

  // 2) Drop balls in playing games per interval
  const { data: playing } = await sb
    .from("games")
    .select("id, room_id, rooms(ball_interval_ms, name)")
    .eq("status", "playing");

  for (const g of playing ?? []) {
    const interval = g.rooms?.ball_interval_ms ?? 3000;
    const last = lastBallAt.get(g.id) ?? 0;
    if (Date.now() - last < interval) continue;
    const { data, error } = await sb.rpc("call_next_ball", { p_game_id: g.id });
    if (error) {
      console.error(`✗ ${g.rooms?.name}:`, error.message);
      continue;
    }
    if (data?.finished) {
      console.log(`✓ ${g.rooms?.name} finished`);
      lastBallAt.delete(g.id);
    } else if (data?.ball) {
      console.log(`🎱 ${g.rooms?.name}: ${data.ball} (#${data.sequence})`);
      lastBallAt.set(g.id, Date.now());
    }
  }

  // 3) Scheduling — every 10s
  if (Date.now() - lastSched > SCHED_INTERVAL_MS) {
    lastSched = Date.now();
    await cleanupGhostGames().catch((e) => console.error("cleanup err:", e.message));
    await ensureScheduledRounds().catch((e) => console.error("sched err:", e.message));
  }

  // 4) MC messages
  const now = Date.now();
  for (const g of playing ?? []) {
    const last = lastMcAt.get(g.id) ?? 0;
    if (now - last < MC_INTERVAL_MS) continue;
    lastMcAt.set(g.id, now);
    const { data: cards } = await sb.from("cards").select("card_data").eq("game_id", g.id).limit(50);
    const { data: bs } = await sb.from("balls_called").select("ball_number").eq("game_id", g.id);
    const calledSet = new Set((bs ?? []).map((b) => b.ball_number));
    const anyOneToGo = (cards ?? []).some((c) => {
      const matrix = c.card_data;
      if (!Array.isArray(matrix) || matrix.length !== 5) return false;
      for (let r = 0; r < 5; r++) {
        let miss = 0;
        for (let cc = 0; cc < 5; cc++) {
          const v = matrix[r][cc];
          if (v !== "FREE" && !calledSet.has(v)) miss++;
        }
        if (miss === 1) return true;
      }
      return false;
    });
    await postMcMessage(g.id, anyOneToGo ? "near_win" : "idle");
  }
}

setInterval(() => {
  tick().catch((e) => console.error("tick:", e.message));
}, TICK_MS);
