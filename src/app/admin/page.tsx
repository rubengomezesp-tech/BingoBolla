import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import { isAdminEmail } from "@/lib/server/admin";
import { loadWorldOps } from "@/lib/server/world-ops";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/lobby");
  }

  const service = createSupabaseServiceClient();
  const [{ data: stats }, { data: codes }] = service
    ? await Promise.all([
        service.rpc("service_admin_stats", { p_actor_id: user.id }),
        service.rpc("service_admin_list_codes", { p_actor_id: user.id }),
      ])
    : [{ data: null }, { data: [] }];

  let worldOps = null;
  if (service) {
    try {
      worldOps = await loadWorldOps(service, { window: "24h" });
    } catch (error) {
      console.error("[admin.page.world-ops]", error);
    }
  }

  return <AdminClient initialStats={stats} initialCodes={codes ?? []} initialWorldOps={worldOps} />;
}
