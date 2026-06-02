import { redirect } from "next/navigation";
import { Gift, Sparkles, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import EventosHubClient from "@/app/eventos/EventosHubClient";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";

export const dynamic = "force-dynamic";

type DailyStatus = {
  available?: boolean;
  seconds_left?: number;
};

export default async function EventosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createSupabaseServiceClient();
  const [{ data: profile }, { data: dailyStatus }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,gold_coins,sweeps_coins,diamonds")
      .eq("id", user.id)
      .single<WorldEventProfile>(),
    service
      ? service.rpc("service_daily_bonus_status", { p_actor_id: user.id })
      : Promise.resolve({ data: null }),
  ]);

  const daily = (dailyStatus ?? {}) as DailyStatus;

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Centro vivo"
      title="Eventos"
      subtitle="Regalos, ruleta, cofres, ranking y Bolla Master en un hub rápido, jugable y fácil de tocar."
      accent="#ff3d7f"
      heroDensity="compact"
      heroArt={<EventHero />}
    >
      <EventosHubClient
        daily={{
          available: Boolean(daily.available),
          secondsLeft: Number(daily.seconds_left ?? 0),
        }}
      />
    </WorldEventPage>
  );
}

function EventHero() {
  return (
    <div className="relative grid h-20 w-20 place-items-center sm:h-44 sm:w-44 md:h-72 md:w-72" aria-hidden="true">
      <div className="absolute inset-5 rounded-full border border-[#ff3d7f]/36 bg-black/45 shadow-[0_0_58px_rgba(255,61,127,.28)]" />
      <div className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-[#ffb1d0] bg-[linear-gradient(145deg,#ff3d7f,#7b2ff7_58%,#19051f)] shadow-[0_0_34px_rgba(255,61,127,.48)] sm:h-30 sm:w-30 sm:rounded-3xl sm:border-4 md:h-44 md:w-44">
        <Sparkles className="h-8 w-8 text-white drop-shadow-[0_0_18px_rgba(255,255,255,.8)] sm:h-16 sm:w-16 md:h-24 md:w-24" />
      </div>
      <Gift className="absolute bottom-4 left-1 h-5 w-5 rotate-[-12deg] text-[#ffd93d] drop-shadow-[0_0_18px_rgba(255,217,61,.9)] sm:bottom-6 sm:left-2 sm:h-7 sm:w-7 md:bottom-14 md:left-8 md:h-12 md:w-12" />
      <Trophy className="absolute right-1 top-4 h-5 w-5 rotate-[12deg] text-[#00e5ff] drop-shadow-[0_0_18px_rgba(0,229,255,.9)] sm:right-2 sm:top-6 sm:h-7 sm:w-7 md:right-8 md:top-14 md:h-12 md:w-12" />
    </div>
  );
}
