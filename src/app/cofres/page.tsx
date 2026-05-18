import { redirect } from "next/navigation";
import { Gift, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { formatCompact, type WorldEventProfile } from "@/components/world-events/WorldEventPage";
import CofresClient from "./CofresClient";

export const dynamic = "force-dynamic";

export default async function CofresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,gold_coins,sweeps_coins,diamonds")
    .eq("id", user.id)
    .single<WorldEventProfile>();

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Recompensas"
      title="Cofres"
      subtitle="Abre el cofre diario, entra al VIP y deja listo el circuito de premios para eventos y misiones."
      accent="#ffd93d"
      heroArt={<ChestHero gold={Number(profile?.gold_coins ?? 0)} />}
    >
      <CofresClient />
    </WorldEventPage>
  );
}

function ChestHero({ gold }: { gold: number }) {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#ffd93d]/35 bg-[#2c1230]/62 shadow-[0_0_74px_rgba(255,217,61,.24)]" />
      <div className="relative z-10 grid h-44 w-56 place-items-center rounded-[34px] border-4 border-[#fff0a3] bg-[linear-gradient(180deg,#a74621,#3b102e)] shadow-[0_20px_52px_rgba(0,0,0,.55),0_0_38px_rgba(255,217,61,.3)]">
        <div className="absolute -top-11 h-[72px] w-48 rounded-t-[44px] border-4 border-[#fff0a3] bg-[linear-gradient(180deg,#d4662e,#5a153c)]" />
        <Gift className="relative z-10 h-20 w-20 text-[#ffd93d] drop-shadow-[0_0_24px_rgba(255,217,61,.9)]" />
        <div className="absolute bottom-3 rounded-full bg-black/46 px-4 py-1 text-sm font-black text-white">
          {formatCompact(gold)}
        </div>
      </div>
      <Sparkles className="absolute left-9 top-14 h-9 w-9 text-[#ff3d7f] drop-shadow-[0_0_16px_rgba(255,61,127,.9)]" />
      <LockKeyhole className="absolute bottom-11 right-10 h-10 w-10 text-[#00e5ff] drop-shadow-[0_0_18px_rgba(0,229,255,.8)]" />
    </div>
  );
}
