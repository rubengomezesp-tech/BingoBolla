import { NextResponse } from "next/server";
import { UUID_RE, apiError, readJsonRecord } from "@/lib/server/api";
import { stripeAdapter } from "@/lib/payments/stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getCanonicalOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.bingobolla.com";
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return "https://www.bingobolla.com";
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJsonRecord(req);
    const packageId = String(body?.package_id ?? "");
    if (!UUID_RE.test(packageId)) {
      return apiError("invalid_package_id", 400);
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // Fetch package details
    const { data: pkg, error: pkgError } = await supabase
      .from("coin_packages")
      .select("*")
      .eq("id", packageId)
      .eq("active", true)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: "package_not_found" }, { status: 404 });
    }

    const priceCents = Math.round(Number(pkg.price_usd) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return apiError("invalid_package_price", 400);
    }

    const origin = getCanonicalOrigin();

    const session = await stripeAdapter.createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? "",
      packageId: pkg.id,
      packageSku: pkg.sku,
      packageName: pkg.name,
      priceCents,
      successUrl: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/store`,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("[checkout]", err);
    return apiError("checkout_error", 500);
  }
}
