import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import { redirect, notFound } from "next/navigation";
import RoomClient from "./RoomClient";
import type { Profile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const serviceSupabase = createSupabaseServiceClient();
  if (!serviceSupabase) throw new Error("Supabase service role is not configured");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Asegura que existe un waiting_game (idempotente)
  await serviceSupabase.rpc("service_ensure_waiting_game", {
    p_actor_id: user.id,
    p_room_id: id,
  });

  // Estado COMPLETO de la sala (todo en una sola query)
  const [{ data: profile }, { data: state }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    serviceSupabase.rpc("service_get_room_state", {
      p_actor_id: user.id,
      p_room_id: id,
    }),
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
