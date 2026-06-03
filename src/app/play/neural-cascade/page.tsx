import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import NeuralCascadeClient from "@/components/NeuralCascadeClient";

export const dynamic = "force-dynamic";

export default async function NeuralCascadePage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
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
  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const params = await searchParams;
  const level = Math.max(1, parseInt(params.level || "6", 10) || 6);

  return <NeuralCascadeClient level={level} />;
}
