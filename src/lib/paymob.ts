/**
 * All Paymob logic lives in this file. Nothing else in the app talks to Paymob.
 *
 * Flow (modern Intention API + Unified Checkout):
 *   1. Server calls createIntention()  -> returns client_secret
 *   2. Browser is sent to unifiedCheckoutUrl(client_secret)
 *   3. Paymob POSTs the Transaction Processed Callback to /api/paymob/webhook
 *      -> verifyTransactionHmac() proves it really came from Paymob
 *      -> THAT is the source of truth for "paid", never the browser redirect.
 *
 * Docs: https://developers.paymob.com  (Intention APIs Postman collection:
 * https://github.com/PaymobAccept/API-Postman-Collections)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMOB_BASE_URL = "https://accept.paymob.com";

/** Paymob rejects billing_data with missing keys, so every unused field is "NA". */
const NA = "NA";

export type PaymobBillingData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  apartment: string;
  floor: string;
  building: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  shipping_method: string;
};

export type PaymobItem = {
  name: string;
  /** piastres, integer. Paymob requires sum(items) === amount */
  amount: number;
  description: string;
  quantity: number;
};

export type CreateIntentionInput = {
  /** integer piastres, e.g. 100 EGP => 10000 */
  amount: number;
  currency?: string;
  items: PaymobItem[];
  billingData: Partial<PaymobBillingData>;
  /** unique per intention; comes back on the webhook as obj.order.merchant_order_id */
  specialReference: string;
  /** where Paymob POSTs the transaction callback */
  notificationUrl: string;
  /** where the customer's browser lands after paying */
  redirectionUrl: string;
  extras?: Record<string, unknown>;
};

export type CreateIntentionResult = {
  clientSecret: string;
  /** Paymob intention id (uuid-ish string) */
  intentionId: string;
  /** Paymob order id — matches obj.order.id on the webhook */
  paymobOrderId: string | null;
  checkoutUrl: string;
  raw: Record<string, unknown>;
};

/** 100 EGP -> 10000 piastres. Paymob only accepts integers. */
export function egpToPiastres(egp: number): number {
  return Math.round(egp * 100);
}

export function piastresToEgp(piastres: number): number {
  return piastres / 100;
}

/**
 * Fills every billing_data field. Paymob 400s on a partial object, so unknown
 * fields default to "NA" — this is the single most common integration failure.
 */
export function buildBillingData(
  partial: Partial<PaymobBillingData>,
): PaymobBillingData {
  return {
    first_name: partial.first_name?.trim() || NA,
    last_name: partial.last_name?.trim() || NA,
    email: partial.email?.trim() || NA,
    phone_number: partial.phone_number?.trim() || NA,
    apartment: partial.apartment?.trim() || NA,
    floor: partial.floor?.trim() || NA,
    building: partial.building?.trim() || NA,
    street: partial.street?.trim() || NA,
    city: partial.city?.trim() || NA,
    state: partial.state?.trim() || NA,
    country: partial.country?.trim() || NA,
    postal_code: partial.postal_code?.trim() || NA,
    shipping_method: partial.shipping_method?.trim() || NA,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (see .env.example)`);
  return value;
}

/** PAYMOB_INTEGRATION_IDS="1234,5678" -> [1234, 5678] */
export function integrationIds(): number[] {
  const ids = requireEnv("PAYMOB_INTEGRATION_IDS")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) {
    throw new Error("PAYMOB_INTEGRATION_IDS must be comma-separated integers");
  }
  return ids;
}

/**
 * Where the customer pays. publicKey is safe in the URL; the secret key is not
 * and never leaves the server.
 */
export function unifiedCheckoutUrl(clientSecret: string): string {
  const publicKey = requireEnv("PAYMOB_PUBLIC_KEY");
  const url = new URL(`${PAYMOB_BASE_URL}/unifiedcheckout/`);
  url.searchParams.set("publicKey", publicKey);
  url.searchParams.set("clientSecret", clientSecret);
  return url.toString();
}

/**
 * POST https://accept.paymob.com/v1/intention/
 * Header: Authorization: Token <PAYMOB_SECRET_KEY>   (server-only)
 */
export async function createIntention(
  input: CreateIntentionInput,
): Promise<CreateIntentionResult> {
  const secretKey = requireEnv("PAYMOB_SECRET_KEY");

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("amount must be a positive integer in piastres");
  }
  const itemsTotal = input.items.reduce(
    (sum, item) => sum + item.amount * item.quantity,
    0,
  );
  if (itemsTotal !== input.amount) {
    throw new Error(
      `items total (${itemsTotal}) must equal amount (${input.amount}) in piastres`,
    );
  }

  const body = {
    amount: input.amount,
    currency: input.currency ?? "EGP",
    payment_methods: integrationIds(),
    items: input.items,
    billing_data: buildBillingData(input.billingData),
    special_reference: input.specialReference,
    notification_url: input.notificationUrl,
    redirection_url: input.redirectionUrl,
    extras: input.extras ?? {},
  };

  const response = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Paymob intention failed (${response.status}): ${text}`);
  }

  const data = JSON.parse(text) as Record<string, unknown>;
  const clientSecret = data.client_secret;
  if (typeof clientSecret !== "string") {
    throw new Error(`Paymob response had no client_secret: ${text}`);
  }

  const paymobOrderId =
    data.intention_order_id ??
    (data.intention_detail as Record<string, unknown> | undefined)?.order_id ??
    null;

  return {
    clientSecret,
    intentionId: String(data.id ?? ""),
    paymobOrderId: paymobOrderId === null ? null : String(paymobOrderId),
    checkoutUrl: unifiedCheckoutUrl(clientSecret),
    raw: data,
  };
}

/**
 * Exact concatenation order Paymob uses for the TRANSACTION callback HMAC.
 * Order matters — do not sort, do not add fields.
 */
export const TRANSACTION_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function readPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

function hmacValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Paymob stringifies booleans lowercase ("true"/"false"), same as String().
  return String(value);
}

/** The exact string Paymob hashed. Exported so you can log it while debugging. */
export function transactionHmacPayload(obj: unknown): string {
  return TRANSACTION_HMAC_FIELDS.map((field) =>
    hmacValue(readPath(obj, field)),
  ).join("");
}

/**
 * SHA-512 HMAC over the concatenated fields, keyed with PAYMOB_HMAC_SECRET.
 * Reject the callback if this returns false.
 */
export function verifyTransactionHmac(
  obj: unknown,
  receivedHmac: string | null | undefined,
): boolean {
  if (!receivedHmac) return false;
  const secret = requireEnv("PAYMOB_HMAC_SECRET");
  const expected = createHmac("sha512", secret)
    .update(transactionHmacPayload(obj))
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(receivedHmac.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaymobTransaction = {
  id: number;
  success: boolean;
  pending: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  error_occured: boolean;
  amount_cents: number;
  currency: string;
  order: { id: number; merchant_order_id: string | null };
  data?: { message?: string };
};

/** Only true when the money actually moved and stayed moved. */
export function isPaid(transaction: PaymobTransaction): boolean {
  return (
    transaction.success === true &&
    transaction.pending === false &&
    transaction.is_voided === false &&
    transaction.is_refunded === false &&
    transaction.error_occured === false
  );
}
