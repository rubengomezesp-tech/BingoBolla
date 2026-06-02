import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import BollaMasterClient from "./BollaMasterClient";

export const dynamic = "force-dynamic";

type ProfileLite = {
  diamonds?: number | null;
  display_name?: string | null;
  gold_coins?: number | null;
  sweeps_coins?: number | null;
  username?: string | null;
};

export default async function BollaMasterPage() {
  const supabase = await createClient();
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) throw new Error("Supabase service role is not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,gold_coins,sweeps_coins,diamonds")
    .eq("id", user.id)
    .single<ProfileLite>();

  const { data: bollaMasterData } = await serviceSupabase.rpc("service_get_bolla_master_state", {
    p_actor_id: user.id,
  });

  return <BollaMasterClient initialData={bollaMasterData} profile={profile ?? {}} />;
}
