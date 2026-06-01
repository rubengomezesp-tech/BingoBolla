import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import { redirect, notFound } from "next/navigation";
import SlotMachineClient from "./SlotMachineClient";
import HoldWinSlot from "./HoldWinSlot";

export const dynamic = "force-dynamic";

export default async function SlotMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) throw new Error("Supabase service role is not configured");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: state }, { data: profile }, { data: machine }] = await Promise.all([
    serviceSupabase.rpc("service_get_slot_state", {
      p_actor_id: user.id,
      p_slug: id,
    }),
    supabase.from("profiles").select("gold_coins, sweeps_coins, diamonds").eq("id", user.id).single(),
    supabase.from("slot_machines").select("*").eq("slug", id).eq("active", true).single(),
  ]);

  if (!state || (state as any).error) notFound();

  // neon-777 usa el nuevo Hold&Win. Resto sigue con SlotMachineClient (intacto).
  if (id === "neon-777" && machine) {
    return <HoldWinSlot machine={machine} initialProfile={profile} />;
  }

  return <SlotMachineClient initialState={state} initialProfile={profile} userId={user.id} />;
}
