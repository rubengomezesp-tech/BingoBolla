import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "rubengomezesp@gmail.com";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/lobby");
  }

  const [{ data: stats }, { data: codes }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_list_codes"),
  ]);

  return <AdminClient initialStats={stats} initialCodes={codes ?? []} />;
}
