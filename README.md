# LTC Vault — Premium Litecoin Wallet

A clean, premium black-and-white wallet to **deposit and send Litecoin (LTC)**, hosted on your own backend with **Supabase** and deployed on **Vercel**.

## Features
- **Google-only sign-in** via Supabase Auth (no passwords)
- **Unique LTC deposit address per user** — every user gets their own address
- **Deposit & send LTC** with balance tracking
- **Premium black & white UI** — glassmorphism, clean layout
- **Transaction history** with status badges
- **Backend on Supabase** (PostgreSQL + Auth + RLS)
- **Frontend on Next.js + Tailwind CSS v4**
- **Deployed on Vercel**

## Tech Stack
- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — Auth (Google only), PostgreSQL, RLS
- [lucide-react](https://lucide.dev/) — icons
- [Vercel](https://vercel.com/) — hosting

## Project Structure
```
src/
  app/
    page.tsx             # Landing page (premium black/white)
    login/               # Google sign-in page
    dashboard/           # Wallet dashboard (balance, address, send, history)
    api/wallet/          # GET wallet data (balance, address, transactions)
    api/wallet/send/     # POST send LTC
    auth/callback/       # Supabase OAuth callback
    layout.tsx
    globals.css          # Tailwind v4 + premium black/white theme
    middleware.ts        # Auth route protection
  components/
    providers.tsx
    ui/                  # Button, Card, Input, Badge
    wallet/              # BalanceCard, AddressDisplay, SendForm, TransactionList, CopyButton
  lib/
    supabase/
      client.ts          # Browser Supabase client
      server.ts          # Server Supabase client
supabase/
  schema.sql             # Database schema (profiles, wallets, transactions)
```

## Setup

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Authentication → Providers**, enable **Google**, and add your Google Client ID/Secret.
4. Go to **Authentication → URL Configuration**, set:
   - Site URL: your Vercel URL (e.g. `https://your-app.vercel.app`)
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

### 2. Set up the database
Open the **SQL Editor** in Supabase and run the contents of `supabase/schema.sql`. This creates:
- `profiles` (extends auth.users)
- `wallets` (unique LTC address per user, balance)
- `transactions` (deposit/send history)
- Row Level Security policies

### 3. Configure environment
Copy `.env.example` to `.env` and fill in your Supabase values:

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### 4. Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

### 5. Deploy to Vercel
1. Push this repo to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the environment variables above.
4. Deploy — Vercel auto-detects Next.js.

## Important Notes
- **Deposit addresses** generated in this build are deterministic placeholders. For production with real funds, back each address with real private keys via an HD wallet (BIP44) or a third-party address-generation service, and monitor deposits via a blockchain API (e.g. SoChain/BlockCypher).
- **Sending LTC** records the transaction and deducts balance in Supabase. Real blockchain broadcast requires private-key signing on a secure backend (never expose private keys in the frontend).
- Google is the **only** sign-in method (email/phone auth disabled by design).
