/**
 * Run: npm test
 *
 * Locks down the two things that silently break a Paymob integration:
 * the HMAC field order, and billing_data defaulting to "NA".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  buildBillingData,
  egpToPiastres,
  isPaid,
  transactionHmacPayload,
  verifyTransactionHmac,
  type PaymobTransaction,
} from "./paymob.ts";

const SECRET = "test-hmac-secret";

const transaction = {
  amount_cents: 10000,
  created_at: "2026-08-15T10:00:00.000000",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  id: 987654,
  integration_id: 1234567,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 555111, merchant_order_id: "e2f6a0a2-0000-4000-8000-000000000001" },
  owner: 42,
  pending: false,
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
  success: true,
} as unknown as PaymobTransaction;

test("hmac payload uses Paymob's exact field order", () => {
  assert.equal(
    transactionHmacPayload(transaction),
    "10000" +
      "2026-08-15T10:00:00.000000" +
      "EGP" +
      "false" +
      "false" +
      "987654" +
      "1234567" +
      "true" +
      "false" +
      "false" +
      "false" +
      "true" +
      "false" +
      "555111" +
      "42" +
      "false" +
      "2346" +
      "MasterCard" +
      "card" +
      "true",
  );
});

test("verifyTransactionHmac accepts a real signature and rejects tampering", () => {
  process.env.PAYMOB_HMAC_SECRET = SECRET;
  const signature = createHmac("sha512", SECRET)
    .update(transactionHmacPayload(transaction))
    .digest("hex");

  assert.equal(verifyTransactionHmac(transaction, signature), true);
  assert.equal(verifyTransactionHmac(transaction, signature.toUpperCase()), true);
  assert.equal(verifyTransactionHmac(transaction, "deadbeef"), false);
  assert.equal(verifyTransactionHmac(transaction, null), false);

  // Attacker flips the amount but keeps the old signature.
  const tampered = { ...transaction, amount_cents: 1 };
  assert.equal(verifyTransactionHmac(tampered, signature), false);
});

test("billing_data fills every field with NA", () => {
  const billing = buildBillingData({ email: "a@b.com", first_name: " Ali " });
  assert.equal(billing.email, "a@b.com");
  assert.equal(billing.first_name, "Ali");
  for (const value of Object.values(billing)) {
    assert.notEqual(value, "");
  }
  assert.equal(billing.postal_code, "NA");
  assert.equal(billing.shipping_method, "NA");
});

test("amounts convert to integer piastres", () => {
  assert.equal(egpToPiastres(100), 10000);
  assert.equal(egpToPiastres(99.99), 9999);
});

test("isPaid only accepts a settled successful transaction", () => {
  assert.equal(isPaid(transaction), true);
  assert.equal(isPaid({ ...transaction, is_refunded: true }), false);
  assert.equal(isPaid({ ...transaction, pending: true }), false);
  assert.equal(isPaid({ ...transaction, success: false }), false);
});
