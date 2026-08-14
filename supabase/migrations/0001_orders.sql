-- Orders for the Paymob flow.
-- Run this in Supabase Studio > SQL Editor, or `supabase db push` with the CLI.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- piastres (integer). 100 EGP => 10000. Paymob only accepts integers.
  amount integer not null check (amount > 0),
  currency text not null default 'EGP',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  paymob_order_id text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_paymob_order_id_idx
  on public.orders (paymob_order_id);

alter table public.orders enable row level security;

-- Users can read their own orders. That is all they can do.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies on purpose: order writes happen server-side
-- with the service-role key (/api/checkout and /api/paymob/webhook), so a
-- browser can never create or mark an order paid.

-- TODO: add your own product tables here.
