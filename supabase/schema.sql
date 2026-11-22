-- LTC Wallet Database Schema (Real blockchain wallet)
-- Run this in your Supabase project's SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Wallets table - one per user, real LTC address + encrypted private key
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null unique,
  ltc_address text not null unique,
  priv_key_encrypted text,
  balance_ltc numeric(20, 8) default 0,
  last_checked_at timestamptz,
  -- Solana (SOL) wallet - separate address + encrypted Ed25519 secret key
  sol_address text,
  sol_priv_key_encrypted text,
  sol_balance numeric(20, 8) default 0,
  sol_last_checked_at timestamptz,
  created_at timestamptz default now()
);

-- Migration: add Solana wallet columns to existing DBs (idempotent).
alter table public.wallets add column if not exists sol_address text;
alter table public.wallets add column if not exists sol_priv_key_encrypted text;
alter table public.wallets add column if not exists sol_balance numeric(20, 8);
alter table public.wallets add column if not exists sol_last_checked_at timestamptz;

-- Transactions table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  wallet_id uuid references public.profiles(id) not null,
  type text check (type in ('deposit', 'send')) not null,
  amount_ltc numeric(20, 8) not null,
  status text check (status in ('completed', 'pending', 'failed')) default 'pending',
  counterparty_address text,
  counterparty_name text,
  note text,
  tx_hash text unique,
  -- On-chain details (populated during wallet sync from SoChain)
  confirmations integer,
  block_height integer,
  fee_ltc numeric(20, 8),
  estimated_time text,
  -- Which chain this transaction belongs to ('ltc' or 'sol')
  coin text default 'ltc',
  created_at timestamptz default now()
);

-- Migration: add coin column to existing transaction rows (default 'ltc').
alter table public.transactions add column if not exists coin text default 'ltc';

-- Migration: add on-chain detail columns to existing DBs (idempotent).
alter table public.transactions add column if not exists confirmations integer;
alter table public.transactions add column if not exists block_height integer;
alter table public.transactions add column if not exists fee_ltc numeric(20, 8);
alter table public.transactions add column if not exists estimated_time text;

-- Saved addresses (whitelist) - quick-select recipients on withdraw
create table if not exists public.saved_addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  label text not null,
  address text not null,
  created_at timestamptz default now()
);

-- Receive requests (invoices) - a user asks to receive a specific amount
create table if not exists public.receive_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  amount_ltc numeric(20, 8) not null,
  note text,
  -- Which coin this request is for ('ltc' or 'sol')
  coin text default 'ltc',
  created_at timestamptz default now()
);

-- Migration: add coin column to existing receive_requests rows.
alter table public.receive_requests add column if not exists coin text default 'ltc';

-- Indexes
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_tx_hash on public.transactions(tx_hash);
create index if not exists idx_wallets_ltc_address on public.wallets(ltc_address);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.saved_addresses enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Wallets: users can view their own wallet
create policy "Users can view own wallet"
  on public.wallets for select
  using ( auth.uid() = user_id );

-- Transactions: users can view their own transactions
create policy "Users can view own transactions"
  on public.transactions for select
  using ( auth.uid() = wallet_id );

-- Saved addresses: users manage their own saved addresses
create policy "Users manage own saved addresses"
  on public.saved_addresses for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Notes:
-- - Deposits: on wallet load, the API queries SoChain for incoming LTC to
--   ltc_address. New confirmed incoming txs are credited to balance_ltc and
--   recorded as 'deposit' transactions (with tx_hash for the explorer link).
-- - Sends: build + sign + broadcast a real LTC transaction via SoChain, then
--   debit balance_ltc and record a 'send' transaction (with tx_hash).
-- - Private keys are encrypted at rest with WALLET_SECRET_KEY.
-- - Each user gets exactly one unique real LTC address.
