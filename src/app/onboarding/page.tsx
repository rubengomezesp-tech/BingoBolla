import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ipFromHeaders, lookupIp } from "@/lib/geo/lookup";
import type { Profile } from "@/lib/supabase/types";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Already verified → bounce to lobby
  if (profile?.kyc_status === "self_declared" || profile?.kyc_status === "verified") {
    redirect("/lobby");
  }

  // Geo lookup for default state suggestion
  const h = await headers();
  const ip = ipFromHeaders(h);
  const geo = await lookupIp(ip);

  // Save IP to profile
  if (geo) {
    await supabase
      .from("profiles")
      .update({
        last_ip: geo.ip,
        last_ip_state: geo.state,
        last_ip_country: geo.country,
        last_ip_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  return <OnboardingForm suggestedState={geo?.state ?? null} username={profile?.username ?? ""} />;
}
