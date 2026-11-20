-- LTC Wallet Database Schema
-- Run this in your Supabase project's SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Wallets table - one per user, with a unique LTC deposit address
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null unique,
  ltc_address text not null unique,
  balance_ltc numeric(20, 8) default 0,
  created_at timestamptz default now()
);

-- Transactions table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  wallet_id uuid references public.profiles(id) not null,
  type text check (type in ('deposit', 'send')) not null,
  amount_ltc numeric(20, 8) not null,
  status text check (status in ('completed', 'pending', 'failed')) default 'pending',
  counterparty_address text,
  tx_hash text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_wallets_ltc_address on public.wallets(ltc_address);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

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

-- Notes:
-- - Deposits: detect incoming LTC to ltc_address via an external API (e.g. SoChain)
--   and credit balance_ltc + insert a 'deposit' transaction.
-- - Sends: debit balance_ltc + insert a 'send' transaction (this build records intent;
--   real broadcast requires private key signing on a secure backend).
-- - Each user gets exactly one unique ltc_address.
