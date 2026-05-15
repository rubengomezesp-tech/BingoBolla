import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import RoomClient from "./RoomClient";
import type { Profile, RoomLive } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Asegura que hay un waiting_game (idempotente — si ya hay uno activo, no hace nada)
  await supabase.rpc("ensure_waiting_game", { p_room_id: id });

  const [{ data: profile }, { data: room }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("rooms_live").select("*").eq("id", id).single<RoomLive>(),
  ]);

  if (!room) notFound();

  return <RoomClient initialRoom={room} initialProfile={profile!} userId={user.id} />;
}
