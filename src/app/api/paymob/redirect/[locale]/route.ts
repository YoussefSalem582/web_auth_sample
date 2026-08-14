import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/**
 * Where Paymob sends the customer's browser after checkout.
 *
 * This only decides which page to show. It never marks an order paid — the
 * webhook does that. The locale is in the path because Paymob appends its own
 * query params to this URL.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/paymob/redirect/[locale]">,
) {
  const { locale: raw } = await params;
  const locale = (routing.locales as readonly string[]).includes(raw)
    ? raw
    : routing.defaultLocale;

  const query = request.nextUrl.searchParams;
  const success = query.get("success") === "true";
  const orderRef = query.get("merchant_order_id") ?? query.get("order") ?? "";

  const target = new URL(
    `/${locale}/checkout/${success ? "success" : "failure"}`,
    request.nextUrl.origin,
  );
  if (orderRef) target.searchParams.set("order", orderRef);

  return NextResponse.redirect(target);
}

// Paymob may POST the redirect for some payment methods.
export const POST = GET;
