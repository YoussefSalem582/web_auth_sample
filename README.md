# Paymob Starter — Next.js + Supabase + Tailwind

A hackathon starter with the boring parts already done: auth, database, Arabic/English
with real RTL, dark mode, and a **working Paymob payment flow** (Intention API +
Unified Checkout + HMAC-verified webhook).

Clone it, fill in `.env.local`, run one SQL file, and you have a payment you can
demo in under a minute. Then delete the demo and build your product.

---

## Quick start (about 10 minutes)

```bash
npm install
cp .env.example .env.local   # fill it in — see "Getting your keys" below
npm run dev
```

1. **Create a Supabase project** → https://supabase.com/dashboard
2. **Run the migration**: Supabase Studio → SQL Editor → paste
   [`supabase/migrations/0001_orders.sql`](supabase/migrations/0001_orders.sql) → Run
3. **Turn off email confirmation** (optional, saves time during a hackathon):
   Authentication → Sign In / Providers → Email → uncheck "Confirm email"
4. **Fill in `.env.local`** with the Supabase and Paymob keys
5. Open http://localhost:3000 → Sign up → Pay demo → **Pay 100 EGP**

`/` redirects to `/ar` (Arabic is the default locale). The language button in the
header swaps to `/en`.

---

## Environment variables

Every variable lives in [`.env.example`](.env.example). Where each one comes from:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally. **Set it to your ngrok URL while testing webhooks**, and to your domain on Vercel. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key. **Server only.** Bypasses RLS. |
| `PAYMOB_SECRET_KEY` | Paymob dashboard → Settings → Account Info → API Keys → **Secret Key** (`egy_sk_test_…` / `egy_sk_live_…`). **Server only, never expose.** |
| `PAYMOB_PUBLIC_KEY` | Same screen → **Public Key** (`egy_pk_test_…`). Safe — it ends up in the checkout URL. |
| `PAYMOB_INTEGRATION_IDS` | Paymob dashboard → Developers → Payment Integrations. Each row (Online Card, Mobile Wallet, …) has an **integration ID**. Comma-separate them: `1234567,7654321`. |
| `PAYMOB_HMAC_SECRET` | Paymob dashboard → Settings → Account Info → **HMAC**. Used to verify webhooks. |

> Paymob occasionally renames dashboard sections. If you cannot find a key, look
> for "Account Info", "API Keys", or "Integrations" — the values themselves have
> not changed shape.

Use a **test** Paymob account for the hackathon: card `4987654321098769`,
exp `12/25`, CVV `123`, any name — the standard Paymob sandbox test card.

---

## How the payment flow works

```
Browser                    Your server                     Paymob
   |                            |                             |
   |-- POST /api/checkout ----->|                             |
   |                            |-- insert order (pending) -->| Supabase
   |                            |-- POST /v1/intention/ ----->|
   |                            |   Authorization: Token SK   |
   |                            |<-- client_secret -----------|
   |<-- { checkoutUrl } --------|                             |
   |                                                          |
   |-- redirect to /unifiedcheckout/?publicKey=..&clientSecret=..
   |                          (customer pays)                 |
   |                            |<-- POST /api/paymob/webhook |
   |                            |    verify HMAC (SHA-512)    |
   |                            |    orders.status = paid     |
   |<-- redirect to /{locale}/checkout/success ---------------|
```

**The webhook is the source of truth.** The browser redirect only decides which
page to show — anyone can type `/en/checkout/success` in the address bar. Orders
are only marked `paid` in `/api/paymob/webhook`, after the HMAC checks out.

All Paymob code lives in **[`src/lib/paymob.ts`](src/lib/paymob.ts)** — hand that
one file to a teammate and they have the whole integration.

---

## Testing the webhook locally with ngrok

Paymob cannot reach `localhost`, so you need a public tunnel.

```bash
ngrok http 3000
```

1. Copy the HTTPS URL ngrok prints, e.g. `https://a1b2c3d4.ngrok-free.app`
2. Set it in `.env.local`:
   ```
   NEXT_PUBLIC_SITE_URL=https://a1b2c3d4.ngrok-free.app
   ```
3. Restart `npm run dev` (env changes need a restart)
4. Run the demo payment. `notification_url` and `redirection_url` are built from
   `NEXT_PUBLIC_SITE_URL` on every intention, so Paymob will call your machine.

You can also set the callback per integration in the Paymob dashboard
(Developers → Payment Integrations → edit → Transaction processed callback), but
the `notification_url` we send with each intention **overrides** it, so the
env var is usually all you need.

Watch it land:

```bash
# your dev server logs will show either
[paymob webhook] paid { orderId: '…', paymobOrderId: '…' }
# or, if the signature did not match
[paymob webhook] HMAC mismatch — ignoring callback
```

An HMAC mismatch almost always means `PAYMOB_HMAC_SECRET` is wrong or copied
from a different Paymob account.

---

## Deploy to Vercel

```bash
npx vercel        # first deploy, links the project
npx vercel --prod
```

Or push to GitHub and import the repo at https://vercel.com/new.

Then, in Vercel → Project → Settings → Environment Variables, add **every**
variable from `.env.example` for the Production environment, with
`NEXT_PUBLIC_SITE_URL` set to your real domain (e.g.
`https://your-app.vercel.app`, no trailing slash). Redeploy after adding them.

Finally, in Supabase → Authentication → URL Configuration, add your Vercel domain
to **Site URL** and **Redirect URLs**, otherwise email confirmation links point at
localhost.

No other Vercel configuration is needed — the app is a stock Next.js App Router
project.

---

## Where to plug in your own logic

Search the repo for `TODO:`. The ones that matter:

| File | What to change |
| --- | --- |
| [`src/app/api/checkout/route.ts`](src/app/api/checkout/route.ts) | Price your real product **server-side**. Right now it trusts `amountEgp` from the browser, which is fine for a demo and wrong for production. |
| [`src/app/api/paymob/webhook/route.ts`](src/app/api/paymob/webhook/route.ts) | Fulfilment: send the receipt, unlock the feature, credit the wallet. Make it **idempotent** — Paymob retries callbacks. |
| [`supabase/migrations/0001_orders.sql`](supabase/migrations/0001_orders.sql) | Add your own tables and RLS policies. |
| [`src/app/[locale]/page.tsx`](src/app/%5Blocale%5D/page.tsx) | Replace the landing page. |
| [`src/app/[locale]/demo/page.tsx`](src/app/%5Blocale%5D/demo/page.tsx) | Replace the hardcoded 100 EGP with your cart. |
| [`src/proxy.ts`](src/proxy.ts) | Add protected path prefixes. |

---

## Project layout

```
src/
  app/
    [locale]/               all pages, locale-prefixed (/ar/…, /en/…)
      page.tsx              landing
      sign-in, sign-up      email + password auth
      dashboard             example protected route, lists your orders
      demo                  the "Pay 100 EGP" button
      checkout/success      after a successful redirect
      checkout/failure      after a failed redirect
    api/
      checkout              creates the order + Paymob intention (secret key lives here)
      paymob/webhook        Transaction Processed Callback, HMAC-verified
      paymob/redirect/[locale]  sends the browser to success or failure
  components/ui/            Button, Input, Card, Spinner
  i18n/                     next-intl routing, request config, navigation helpers
  lib/
    paymob.ts               ← every line of Paymob logic
    paymob.test.ts          HMAC + billing_data tests
    supabase/               browser, server and service-role clients
  proxy.ts                  locale routing + Supabase session refresh
messages/                   ar.json (default), en.json
supabase/migrations/        orders table + RLS
```

### Internationalisation and RTL

- Arabic is the default locale; `/` redirects to `/ar`.
- `<html dir>` is set from the locale in
  [`src/app/[locale]/layout.tsx`](src/app/%5Blocale%5D/layout.tsx), and the UI uses
  Tailwind **logical** utilities (`ms-*`, `me-*`, `ps-*`, `text-start`) so the
  whole layout mirrors — this is real RTL, not just a `lang` attribute.
- Add a language: add it to `locales` and `localeDirections` in
  [`src/i18n/routing.ts`](src/i18n/routing.ts) and drop a `messages/<code>.json` in.
- To honour the visitor's browser language instead of always starting in Arabic,
  set `localeDetection: true` in `src/i18n/routing.ts`.

### Security notes

- `PAYMOB_SECRET_KEY` is only ever read in `src/lib/paymob.ts`, which is imported
  exclusively by server route handlers. It has no `NEXT_PUBLIC_` prefix, so Next.js
  cannot leak it into the client bundle.
- The `orders` table has a select-own RLS policy and **no** insert/update policy.
  All writes go through the service-role key on the server, so a browser can never
  create an order or mark one paid.
- Webhook signatures are compared with `crypto.timingSafeEqual`.

---

## Tests

```bash
npm test
```

Five assertions over the parts that fail silently: the exact HMAC field order,
signature verification (including a tampered-amount case), `billing_data`
defaulting to `"NA"`, EGP → piastres conversion, and the `isPaid` rules.

---

## Assumptions and sources

Verified against the official
[PaymobAccept/API-Postman-Collections](https://github.com/PaymobAccept/API-Postman-Collections)
repo (`Intention APIs.postman_collection.json`):

- `POST https://accept.paymob.com/v1/intention/` with header
  `Authorization: Token <secret key>`
- Body fields: `amount`, `currency`, `payment_methods` (array of integration IDs
  as integers), `items`, `billing_data`, `special_reference`, `notification_url`,
  `redirection_url`, `extras`
- Checkout URL: `https://accept.paymob.com/unifiedcheckout/?publicKey=<pk>&clientSecret=<cs>`
- `special_reference` comes back on the callback as `obj.order.merchant_order_id`
- `redirection_url` works for card and wallet methods, and overrides the
  per-integration callback configured in the dashboard

Taken from Paymob's HMAC documentation (developers.paymob.com — the docs site
blocks automated fetches, so this was cross-checked against Paymob's regional
docs and community implementations):

- Transaction callback HMAC = SHA-512 over these fields concatenated **in this
  order**: `amount_cents`, `created_at`, `currency`, `error_occured`,
  `has_parent_transaction`, `id`, `integration_id`, `is_3d_secure`, `is_auth`,
  `is_capture`, `is_refunded`, `is_standalone_payment`, `is_voided`, `order.id`,
  `owner`, `pending`, `source_data.pan`, `source_data.sub_type`,
  `source_data.type`, `success`
- Booleans are stringified lowercase (`true` / `false`)

Assumptions worth knowing:

- **`hmac` arrives as a query parameter** on the callback URL. The webhook also
  accepts it in the JSON body, so either delivery style works.
- **Amount is in piastres**, integer, and `sum(items) === amount`. The intention
  call throws locally if they disagree, rather than letting Paymob 400 you.
- **`billing_data` is filled completely**, with `"NA"` for anything unknown.
  Partial billing data is the most common cause of a rejected intention.
- The Paymob order id is read from `intention_order_id` in the intention
  response, falling back to `intention_detail.order_id`. The webhook matches
  orders on `merchant_order_id` first and only falls back to the Paymob order id,
  so a change in that response field cannot break reconciliation.
- Card-token and delivery callbacks use a **different** HMAC field order. This
  starter only verifies `type: "TRANSACTION"` and ignores other callback types.
- The end-to-end payment was not run against a live Paymob account (no test
  credentials at build time). Everything else here — routing, RTL, auth gating,
  the redirect handler, HMAC verification, and the 401s for unsigned webhooks and
  signed-out checkout — was exercised against the running app.
