import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import RoomClient from "./RoomClient";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Asegura que existe un waiting_game (idempotente)
  await supabase.rpc("ensure_waiting_game", { p_room_id: id });

  // Estado COMPLETO de la sala (todo en una sola query)
  const [{ data: profile }, { data: state }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.rpc("get_room_state", { p_room_id: id }),
  ]);

  if (!state || (state as any).error) notFound();

  return (
    <RoomClient
      initialState={state}
      initialProfile={profile!}
      userId={user.id}
    />
  );
}
