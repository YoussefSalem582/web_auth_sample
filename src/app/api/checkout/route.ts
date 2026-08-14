import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createIntention, egpToPiastres } from "@/lib/paymob";
import { routing } from "@/i18n/routing";

/**
 * Server-only. This is the only place the Paymob secret key is used, and it
 * never reaches the browser.
 *
 * 1. require a signed-in user
 * 2. insert a pending order (our uuid becomes Paymob's special_reference)
 * 3. create the Paymob intention
 * 4. hand the browser a Unified Checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      amountEgp?: number;
      locale?: string;
    };

    // TODO: price your real product here instead of trusting the client.
    // Never let the browser decide what an item costs.
    const amountEgp = Number(body.amountEgp ?? 100);
    if (!Number.isFinite(amountEgp) || amountEgp <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const amount = egpToPiastres(amountEgp);

    const locale = (routing.locales as readonly string[]).includes(
      body.locale ?? "",
    )
      ? body.locale!
      : routing.defaultLocale;

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
    ).replace(/\/$/, "");

    const admin = createAdminClient();
    const { data: order, error: insertError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        amount,
        currency: "EGP",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !order) {
      return NextResponse.json(
        { error: insertError?.message ?? "Could not create order" },
        { status: 500 },
      );
    }

    const intention = await createIntention({
      amount,
      currency: "EGP",
      items: [
        {
          name: "Demo item",
          amount,
          description: "Paymob starter demo payment",
          quantity: 1,
        },
      ],
      // Everything not collected is defaulted to "NA" inside buildBillingData.
      billingData: {
        first_name: user.user_metadata?.first_name ?? "Buildathon",
        last_name: user.user_metadata?.last_name ?? "Demo",
        email: user.email ?? undefined,
        phone_number: user.phone || "+201000000000",
      },
      // Comes back on the webhook as obj.order.merchant_order_id.
      specialReference: order.id,
      notificationUrl: `${siteUrl}/api/paymob/webhook`,
      redirectionUrl: `${siteUrl}/api/paymob/redirect/${locale}`,
      extras: { order_id: order.id },
    });

    await admin
      .from("orders")
      .update({ paymob_order_id: intention.paymobOrderId })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      clientSecret: intention.clientSecret,
      checkoutUrl: intention.checkoutUrl,
    });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
