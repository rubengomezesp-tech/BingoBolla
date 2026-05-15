import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find the purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("*")
    .eq("provider_session_id", session_id ?? "")
    .single();

  return (
    <div className="min-h-screen bg-bb-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border-4 border-bb-ink p-10 max-w-md w-full chunky-shadow text-center">
        <div className="text-6xl mb-4 bounce-in">🎉</div>
        <h1 className="display-font chunky text-4xl text-bb-ink mb-3">¡Compra completa!</h1>

        {purchase?.status === "completed" ? (
          <div className="space-y-2 mb-6">
            <div className="bg-bb-cream rounded-2xl p-4">
              <div className="chunky text-bb-ink text-2xl">🪙 +{purchase.gold_received.toLocaleString()} Gold</div>
              {purchase.sweeps_received > 0 && (
                <div className="chunky text-bb-magenta text-xl mt-1">
                  💎 +${Number(purchase.sweeps_received).toFixed(2)} Sweeps
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="font-bold text-bb-ink/60 mb-6">
            Procesando tu pago... los coins llegarán en segundos. Refresca esta página.
          </p>
        )}

        <Link
          href="/lobby"
          className="inline-block w-full py-4 rounded-2xl bg-bb-magenta text-white chunky chunky-shadow"
        >
          A jugar →
        </Link>
      </div>
    </div>
  );
}
