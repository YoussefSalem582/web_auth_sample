import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPaid, verifyTransactionHmac, type PaymobTransaction } from "@/lib/paymob";

/**
 * Paymob "Transaction Processed Callback".
 *
 * THIS is the source of truth for payment success — not the browser redirect,
 * which a user can fake by typing the success URL.
 *
 * Paymob sends: { type: "TRANSACTION", obj: {...} } with ?hmac=... on the URL.
 */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    type?: string;
    obj?: PaymobTransaction;
    hmac?: string;
  } | null;

  if (!payload?.obj) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const hmac = request.nextUrl.searchParams.get("hmac") ?? payload.hmac ?? null;
  if (!verifyTransactionHmac(payload.obj, hmac)) {
    console.warn("[paymob webhook] HMAC mismatch — ignoring callback");
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  if (payload.type && payload.type !== "TRANSACTION") {
    // Card-token and delivery callbacks use a different HMAC field order.
    return NextResponse.json({ ok: true, ignored: payload.type });
  }

  const transaction = payload.obj;
  const status = isPaid(transaction)
    ? "paid"
    : transaction.pending
      ? "pending"
      : "failed";

  // special_reference we sent comes back as order.merchant_order_id.
  const orderId = transaction.order?.merchant_order_id ?? null;
  const paymobOrderId =
    transaction.order?.id != null ? String(transaction.order.id) : null;

  const admin = createAdminClient();
  const query = admin
    .from("orders")
    .update({ status, paymob_order_id: paymobOrderId });

  const { data, error } = orderId
    ? await query.eq("id", orderId).select("id")
    : await query.eq("paymob_order_id", paymobOrderId).select("id");

  if (error) {
    console.error("[paymob webhook] update failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: this is where your product logic goes — fulfil the order, send the
  // receipt, credit the wallet. Make it idempotent: Paymob retries callbacks.
  if (status === "paid") {
    console.log("[paymob webhook] paid", { orderId, paymobOrderId });
  }

  // Always 200 once verified, even if we found no matching row, so Paymob
  // stops retrying a callback we will never be able to match.
  return NextResponse.json({ ok: true, status, matched: data?.length ?? 0 });
}
