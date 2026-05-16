import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import SlotMachineClient from "./SlotMachineClient";

export const dynamic = "force-dynamic";

export default async function SlotMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: state }, { data: profile }] = await Promise.all([
    supabase.rpc("get_slot_state", { p_slug: id }),
    supabase.from("profiles").select("gold_coins, sweeps_coins, diamonds").eq("id", user.id).single(),
  ]);

  if (!state || (state as any).error) notFound();

  return <SlotMachineClient initialState={state} initialProfile={profile} userId={user.id} />;
}
