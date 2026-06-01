import { redirect } from "next/navigation";
import HomeScreen from "@/components/HomeScreen";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile?.kyc_status || profile.kyc_status === "unverified") {
    redirect("/onboarding");
  }

  const { data: excluded } = await supabase
    .from("excluded_states")
    .select("state")
    .eq("blocks_sweeps", true);

  const excludedSet = new Set(excluded?.map((entry) => entry.state) ?? []);
  const stateExcluded = !!(profile.state && excludedSet.has(profile.state));

  const { data: rooms } = await supabase
    .from("rooms_live")
    .select("*")
    .order("ticket_sweeps", { ascending: true });

  const roomsLite = ((rooms as any[]) ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    variant: room.variant,
    current_game_id: room.current_game_id ?? null,
    ticket_gold: Number(room.ticket_gold ?? 0),
    ticket_sweeps: Number(room.ticket_sweeps ?? 0),
    max_cards_per_player: Number(room.max_cards_per_player ?? 0),
    players_in_play: room.players_in_play ?? null,
    effective_pot_sweeps: room.effective_pot_sweeps ?? null,
    effective_pot_gold: room.effective_pot_gold ?? null,
    game_status: room.game_status ?? null,
    current_game_starts_at: room.current_game_starts_at ?? null,
    cards_in_play: room.cards_in_play ?? null,
    rtp: room.rtp ?? null,
    rollover_gold: room.rollover_gold ?? null,
    rollover_sweeps: room.rollover_sweeps ?? null,
    jackpot_max_balls: room.jackpot_max_balls ?? null,
    schedule_interval_seconds: room.schedule_interval_seconds ?? null,
  }));

  const { data: stats } = await supabase
    .from("player_stats")
    .select("*")
    .eq("player_id", user.id)
    .maybeSingle();

  return (
    <HomeScreen
      username={(profile as any).username ?? "Jugador"}
      gold={profile.gold_coins}
      sweeps={profile.sweeps_coins}
      state={(profile as any).state ?? null}
      stateExcluded={stateExcluded}
      rooms={roomsLite}
      stats={stats as any}
    />
  );
}
