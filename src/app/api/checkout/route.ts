import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripeAdapter } from "@/lib/payments/stripe";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // No necesitamos set aquí para API routes
          },
          remove(name: string, options: any) {
            // No necesitamos remove aquí para API routes
          },
        },
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId } = await req.json();
    
    // Obtener el paquete de la base de datos
    const { data: pkg, error: pkgError } = await supabase
      .from("coin_packages")
      .select("*")
      .eq("id", packageId)
      .single();
    
    if (pkgError || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    
    // Crear sesión de Stripe
    const session = await stripeAdapter.createCheckoutSession({
      packageId: pkg.id,
      packageSku: pkg.sku,
      packageName: pkg.name,
      priceCents: pkg.price_cents,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${origin}/store/success`,
      cancelUrl: `${origin}/store`,
    });

    // Guardar la transacción en la base de datos
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        package_id: pkg.id,
        provider: "stripe",
        provider_session_id: session.id,
        amount_cents: pkg.price_cents,
        status: "pending",
      });

    if (txError) {
      console.error("Error saving transaction:", txError);
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
