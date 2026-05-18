import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import HomeScreen from "@/components/HomeScreen";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const { data: excluded } = await supabase
    .from("excluded_states").select("state").eq("blocks_sweeps", true);
  const excludedSet = new Set(excluded?.map((e: any) => e.state) ?? []);
  const stateExcluded = !!(profile.state && excludedSet.has(profile.state));

  const { data: rooms } = await supabase
    .from("rooms_live").select("*").order("ticket_sweeps", { ascending: true });

  const roomsLite = ((rooms as any[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    variant: r.variant,
    ticket_gold: r.ticket_gold,
    ticket_sweeps: r.ticket_sweeps,
    players_in_play: r.players_in_play ?? null,
    effective_pot_sweeps: r.effective_pot_sweeps ?? null,
  }));

  const { data: stats } = await supabase
    .from("player_stats").select("*").eq("player_id", user.id).maybeSingle();

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
