import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StoreClient from "./StoreClient";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Package = {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  gold_coins: number;
  sweeps_coins_bonus: number;
  popular: boolean;
  best_value: boolean;
};

export default async function StorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.kyc_status === "unverified") redirect("/onboarding");

  const { data: packages } = await supabase
    .from("coin_packages")
    .select("*")
    .eq("active", true)
    .order("display_order");

  return <StoreClient profile={profile} packages={(packages ?? []) as Package[]} />;
}
