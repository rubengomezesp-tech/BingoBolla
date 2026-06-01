import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripeAdapter } from "@/lib/payments/stripe";

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

export async function POST(req: NextRequest) {
  try {
    const { package_id } = await req.json();
    if (!package_id) {
      return NextResponse.json({ error: "package_id required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // Fetch package details
    const { data: pkg, error: pkgError } = await supabase
      .from("coin_packages")
      .select("*")
      .eq("id", package_id)
      .eq("active", true)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: "package_not_found" }, { status: 404 });
    }

    const origin = getCanonicalOrigin();

    const session = await stripeAdapter.createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? "",
      packageId: pkg.id,
      packageSku: pkg.sku,
      packageName: pkg.name,
      priceCents: Math.round(Number(pkg.price_usd) * 100),
      successUrl: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/store`,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err.message ?? "checkout_error" },
      { status: 500 }
    );
  }
}
