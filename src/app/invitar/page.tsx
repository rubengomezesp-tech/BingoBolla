import { redirect } from "next/navigation";
import { HeartHandshake, Share2, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import WorldEventPage, { type WorldEventProfile } from "@/components/world-events/WorldEventPage";
import InviteClient from "./InviteClient";

export const dynamic = "force-dynamic";

export default async function InvitarPage() {
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

  const referralCode = encodeURIComponent(profile?.username || user.id);
  const referralUrl = `https://bingobolla.com/signup?ref=${referralCode}`;

  return (
    <WorldEventPage
      profile={profile}
      eyebrow="Social"
      title="Invitar amigos"
      subtitle="Comparte BingoBolla con tu enlace personal y deja preparada la capa social para rachas, comunidad y recompensas."
      accent="#b388ff"
      heroArt={<InviteArt />}
    >
      <InviteClient referralUrl={referralUrl} username={profile?.username ?? "player"} />
    </WorldEventPage>
  );
}

function InviteArt() {
  return (
    <div className="relative grid h-64 w-64 place-items-center md:h-80 md:w-80" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#b388ff]/35 bg-black/35 shadow-[0_0_70px_rgba(179,136,255,.25)]" />
      <div className="relative z-10 grid h-44 w-44 place-items-center rounded-[38px] border border-white/20 bg-[linear-gradient(180deg,rgba(179,136,255,.22),rgba(255,61,127,.16))] shadow-[0_18px_45px_rgba(0,0,0,.48)]">
        <UsersRound className="h-24 w-24 text-[#d7c5ff] drop-shadow-[0_0_22px_rgba(179,136,255,.9)]" strokeWidth={1.8} />
      </div>
      <Share2 className="absolute right-11 top-14 h-10 w-10 text-[#00e5ff] drop-shadow-[0_0_16px_rgba(0,229,255,.9)]" />
      <HeartHandshake className="absolute bottom-14 left-10 h-10 w-10 text-[#ff7ab0] drop-shadow-[0_0_16px_rgba(255,61,127,.9)]" />
    </div>
  );
}
