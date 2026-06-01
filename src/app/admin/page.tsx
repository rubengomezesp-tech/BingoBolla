import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
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

  const service = createSupabaseServiceClient();
  const [{ data: stats }, { data: codes }] = service
    ? await Promise.all([
        service.rpc("service_admin_stats", { p_actor_id: user.id }),
        service.rpc("service_admin_list_codes", { p_actor_id: user.id }),
      ])
    : [{ data: null }, { data: [] }];

  return <AdminClient initialStats={stats} initialCodes={codes ?? []} />;
}
