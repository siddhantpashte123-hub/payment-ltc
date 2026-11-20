'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Send,
  Wallet,
  Coins,
  Lock,
  Zap,
  Layers,
  ChevronDown,
  HelpCircle,
  Star,
  Compass,
  Rocket,
} from 'lucide-react'

export default function LandingPage() {
  useRevealOnScroll()
  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 grid-bg" />
      <div className="fixed inset-0 -z-10 vignette pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
      <div className="fixed top-1/4 left-[5%] w-80 h-80 bg-white/5 rounded-full blur-[120px] pointer-events-none animate-float-slow" />
      <div className="fixed bottom-1/4 right-[5%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none animate-float" />

      <nav className="fixed top-0 left-0 w-full z-40 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black text-xs font-bold">
              B
            </div>
            <span className="premium-text">BlueWallet</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="#security" className="hover:text-white transition-colors">Security</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button size="sm">
                <ArrowRight size={16} className="mr-1.5" />
                Open Wallet
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative max-w-7xl mx-auto px-6 pt-40 pb-24">
        {/* Hero */}
        <div className="text-center px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-medium uppercase tracking-widest mb-8 reveal">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Mainnet Active · Real on-chain LTC
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight reveal">
            Your <span className="block text-white">Litecoin</span>,{' '}
            <span className="relative inline-block">
              <span className="relative text-transparent bg-clip-text animate-gradient bg-gradient-to-r from-white via-gray-300 to-white">
                BlueWallet
              </span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed reveal">
            A clean, premium black-and-white wallet to deposit and send Litecoin.
            Every user gets a unique on-chain LTC address — with{' '}
            <span className="text-white font-medium">0% platform fee</span>, ever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                <Sparkles size={20} className="mr-2" />
                Open Wallet
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Lock size={14} className="text-emerald-400" />
              Google sign-in · Supabase backend
            </div>
          </div>

          {/* 0% Fee highlight badge */}
          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 reveal">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-500/30" />
              <div className="relative w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Coins size={18} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-white leading-none">0% Platform Fee</p>
              <p className="text-[11px] text-white/50 mt-1">Keep 100% of your Litecoin</p>
            </div>
          </div>
        </div>

        {/* Floating 3D wallet preview */}
        <div className="mt-20 reveal">
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-4 bg-gradient-to-tr from-white/10 to-transparent rounded-3xl blur-2xl" />
            <div className="relative tilt-card glass-panel p-6 animate-float">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black text-sm font-bold">
                    B
                  </div>
                  <span className="font-bold">BlueWallet</span>
                </div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Mainnet</span>
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Available Balance</div>
              <div className="text-3xl font-bold text-white mb-4">
                0.00000000 <span className="text-lg text-white/50">LTC</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Deposit Address</div>
                <div className="font-mono text-xs text-emerald-400 select-all break-all">
                  LhzZo3WjZ9m1ENB9fXTKgzUi7S3GPAKdx7
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <Send size={16} className="text-white mb-1" />
                  <div className="text-[10px] text-white/40 uppercase">Send</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <Wallet size={16} className="text-emerald-400 mb-1" />
                  <div className="text-[10px] text-white/40 uppercase">Receive</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-32 mb-24 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight reveal">
            Premium by design
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Wallet size={28} className="text-emerald-400" />, title: 'Unique LTC Address', desc: 'Every user gets their own real on-chain Litecoin deposit address.' },
              { icon: <ShieldCheck size={28} className="text-white" />, title: 'Google Sign-In', desc: 'Secure Google-only authentication — no passwords to manage.' },
              { icon: <Send size={28} className="text-white" />, title: 'Send & Receive', desc: 'Deposit LTC to your address and send to any LTC address on mainnet.' },
              { icon: <Coins size={28} className="text-emerald-400" />, title: '0% Platform Fee', desc: 'We take nothing. Keep 100% of every Litecoin you deposit and send.' },
              { icon: <Zap size={28} className="text-white" />, title: 'Instant Detection', desc: 'Incoming deposits are auto-detected from the blockchain and credited instantly.' },
              { icon: <Layers size={28} className="text-white" />, title: 'Own Backend', desc: 'Fully self-hosted on Supabase with real transaction explorer links.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="tilt-card glass-panel p-6 reveal"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mb-24 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white tracking-tight reveal">How it works</h2>
              <div className="space-y-5">
                {[
                  { num: '01', title: 'Sign in with Google', desc: 'Connect your Google account securely via Supabase Auth.' },
                  { num: '02', title: 'Get your LTC address', desc: 'A unique real Litecoin address is generated for your account.' },
                  { num: '03', title: 'Deposit & Send', desc: 'Receive LTC or send to any address — 0% fee, on-chain confirmed.' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{step.title}</h3>
                      <p className="text-white/50 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-spin-3d rounded-3xl bg-gradient-to-tr from-white/10 to-transparent blur-xl" />
                <div className="relative glass-panel p-8 w-72">
                  <div className="mb-6 flex items-center gap-2 text-emerald-400 text-xs font-medium uppercase tracking-wider">
                    <ShieldCheck size={14} className="mr-1" />
                    Mainnet · LTC
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-white/10 rounded-lg h-3 w-3/4" />
                      <div className="w-1/3 bg-white/10 rounded-lg h-3" />
                    </div>
                    <div className="font-mono text-emerald-400 text-xs select-all break-all mb-4">
                      LhzZo3WjZ9m1ENB9fXTKgzUi7S3GPAKdx7
                    </div>
                    <Button variant="ghost" size="sm" className="w-full">Copy Address</Button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/40">
                    <Coins size={12} className="text-emerald-400" />
                    0% fee · auto-detected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="mb-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '0%', label: 'Platform Fee' },
              { value: '100%', label: 'On-chain' },
              { value: '1:1', label: 'Unique Address' },
              { value: '24/7', label: 'Auto Detection' },
            ].map((s, i) => (
              <div key={i} className="glass-panel p-6 text-center reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Why BlueWallet */}
        <section className="mt-32 mb-24 max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Why BlueWallet
            </h2>
            <p className="text-white/50 mt-2">
              Built for people who want their Litecoin, simple and secure
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Zap size={24} className="text-emerald-400" />, title: 'Real On-Chain', desc: 'Every deposit and send is a genuine Litecoin mainnet transaction, confirmed and verifiable.' },
              { icon: <Coins size={24} className="text-white" />, title: 'Zero Fees', desc: 'No platform fee on deposits or sends. Keep every LTC you move.' },
              { icon: <ShieldCheck size={24} className="text-white" />, title: 'Encrypted Keys', desc: 'Your private keys are encrypted at rest with a server-side secret.' },
              { icon: <Layers size={24} className="text-emerald-400" />, title: 'Own Backend', desc: 'You control the Supabase backend with row-level security for every user.' },
            ].map((item, i) => (
              <div key={i} className="tilt-card glass-panel p-6 reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security deep-dive */}
        <section id="security" className="mb-24 max-w-5xl mx-auto">
          <div className="glass-panel p-8 md:p-12 reveal">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-4">
                  Security, built in
                </h2>
                <p className="text-white/50 leading-relaxed mb-6">
                  BlueWallet keeps your Litecoin protected at every step. Google-only
                  sign-in, encrypted private keys, and on-chain confirmation mean your
                  funds are always under your control.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: <ShieldCheck size={20} className="text-emerald-400" />, title: 'Google-only auth', desc: 'No passwords. Secure Google sign-in via Supabase.' },
                    { icon: <Lock size={20} className="text-white" />, title: 'Encrypted keys', desc: 'Private keys encrypted with AES-256-GCM before storage.' },
                    { icon: <Layers size={20} className="text-emerald-400" />, title: 'Row-level security', desc: 'Each user only sees their own wallet and transactions.' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        {s.icon}
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{s.title}</h4>
                        <p className="text-white/50 text-xs">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex justify-center">
                <div className="absolute inset-0 animate-spin-3d rounded-3xl bg-gradient-to-tr from-emerald-500/10 to-transparent blur-xl" />
                <div className="relative glass-panel p-8 w-64 text-center animate-float">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-black text-2xl font-bold mx-auto mb-4">
                    B
                  </div>
                  <div className="text-white font-bold text-lg">BlueWallet</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider mt-1">
                    Secure · On-chain · 0% fee
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white/60">
                      🔒 Google sign-in
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-[10px] text-white/60">
                      🔐 Encrypted keys
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-32 mb-24 max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Loved by Litecoin users
            </h2>
            <p className="text-white/50 mt-2">
              Real wallets, real on-chain transactions, zero fees
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "The cleanest LTC wallet I've used. Deposits show up automatically and sending takes seconds.",
                name: 'Ananya R.',
                role: 'Daily LTC user',
                rating: 5,
              },
              {
                quote:
                  '0% fee is the real deal. I moved my whole stack here and never paid a platform cut.',
                name: 'Vikram S.',
                role: 'Trader',
                rating: 5,
              },
              {
                quote:
                  'The QR deposit and receipts make it feel premium. Exactly what a modern wallet should be.',
                name: 'Priya M.',
                role: 'Freelancer',
                rating: 5,
              },
            ].map((t, i) => (
              <div
                key={i}
                className="tilt-card glass-panel p-6 reveal"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-1 text-emerald-400 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="fill-emerald-400 text-emerald-400"
                    />
                  ))}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-5">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {t.name}
                    </div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-24 max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Roadmap
            </h2>
            <p className="text-white/50 mt-2">
              Where BlueWallet is headed
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Rocket size={24} className="text-emerald-400" />,
                tag: 'Live now',
                title: 'Core wallet',
                desc: 'Deposit, withdraw, QR, receipts, live price graph and transaction history — all shipping today.',
              },
              {
                icon: <Compass size={24} className="text-white" />,
                tag: 'Next',
                title: 'Multi-currency',
                desc: 'More than Litecoin. Add BTC and other major chains with the same premium experience.',
              },
              {
                icon: <Layers size={24} className="text-emerald-400" />,
                tag: 'Planned',
                title: 'Mobile apps',
                desc: 'Native iOS and Android apps with biometric unlock and push notifications for every transaction.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="tilt-card glass-panel p-6 reveal"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  {item.icon}
                </div>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 mb-3">
                  {item.tag}
                </span>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mb-24 max-w-4xl mx-auto">
          <div className="glass-panel p-10 md:p-14 text-center reveal relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Ready to manage your Litecoin?
              </h2>
              <p className="text-white/50 mb-8 max-w-xl mx-auto">
                Open your BlueWallet in seconds with Google. Get your unique LTC
                address and start depositing and sending — with 0% platform fee.
              </p>
              <Link href="/login" className="inline-block">
                <Button size="lg">
                  <Sparkles size={20} className="mr-2" />
                  Open BlueWallet
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mb-24 max-w-3xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl font-bold text-white tracking-tight">Frequently asked questions</h2>
            <p className="text-white/50 mt-2">Everything you need to know about BlueWallet</p>
          </div>
          <FaqList />
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black text-xs font-bold">
                B
              </div>
              <span className="font-bold text-xl tracking-tighter premium-text">
                BlueWallet
              </span>
            </div>
            <p className="text-sm text-white/40 max-w-md text-center">
              A premium black-and-white Litecoin wallet. Deposit and send real LTC
              on mainnet with 0% platform fee.
            </p>
            <div className="flex items-center gap-6 text-xs text-white/40">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-white/30">
              © {new Date().getFullYear()} BlueWallet. Premium Litecoin Wallet.
            </div>
            <div className="flex items-center gap-5 text-xs text-white/40">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                Google sign-in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins size={12} className="text-emerald-400" />
                0% platform fee
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers size={12} className="text-emerald-400" />
                Supabase backend
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ---------------- FAQ ----------------

const FAQS = [
  {
    q: 'What is BlueWallet?',
    a: 'BlueWallet is a premium black-and-white Litecoin wallet. It lets you deposit and send real Litecoin (LTC) on the mainnet, with a unique on-chain deposit address for every user.',
  },
  {
    q: 'Is there really a 0% platform fee?',
    a: 'Yes. BlueWallet charges 0% platform fee on your deposits and sends. You keep 100% of the Litecoin you move. Only the standard blockchain network fee (paid to the network, not to us) applies to sends.',
  },
  {
    q: 'How do I deposit Litecoin?',
    a: 'After signing in with Google, your unique LTC deposit address is shown on the dashboard. Send Litecoin to that address from any external wallet. BlueWallet auto-detects the incoming transaction on the blockchain and credits your balance instantly.',
  },
  {
    q: 'How do I send Litecoin?',
    a: 'Open the Send form on your dashboard, enter the recipient LTC address and the amount, then confirm. BlueWallet builds, signs, and broadcasts a real on-chain transaction. You can view the transaction on the blockchain explorer via the tx link.',
  },
  {
    q: 'Do I need to create an account or password?',
    a: 'No. Sign-in is Google-only — there is no email/password to manage. Your wallet and its private key are created automatically and stored encrypted on your own Supabase backend.',
  },
  {
    q: 'Is my wallet secure?',
    a: 'Each user gets a unique real Litecoin address. Private keys are encrypted at rest with a server-side secret. Authentication is handled by Supabase with Google, and all transactions are confirmed on-chain.',
  },
  {
    q: 'Where is BlueWallet hosted?',
    a: 'The frontend and API are deployed on Vercel, and the backend (auth, wallet data, transactions) runs on your own Supabase project with PostgreSQL and row-level security.',
  },
  {
    q: 'Can I track my transactions on the blockchain?',
    a: 'Yes. Every transaction links to a SoChain explorer page where you can see the tx hash, confirmations, and full on-chain details. You can also download your full history as CSV.',
  },
  {
    q: 'Can I request a specific amount from someone?',
    a: 'Yes. The Receive page lets you create a request for a specific LTC amount with a QR code and a shareable link — perfect for asking someone to pay you a set amount.',
  },
  {
    q: 'Are there any limits on deposits or withdrawals?',
    a: 'Deposits have no limit — you can receive any amount of LTC to your unique address. Withdrawals are limited only by your available balance and the standard on-chain network fee.',
  },
  {
    q: 'What happens if I send LTC to a wrong address?',
    a: 'On-chain transactions are irreversible. Always double-check the recipient address in the confirmation modal before confirming a withdrawal. Use saved addresses for frequent recipients to reduce mistakes.',
  },
]

function FaqList() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      {FAQS.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className={`glass-panel overflow-hidden reveal ${
              isOpen ? 'border-white/20' : ''
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="flex items-center gap-3 text-white font-medium">
                <HelpCircle size={18} className="text-emerald-400 flex-shrink-0" />
                {item.q}
              </span>
              <ChevronDown
                size={20}
                className={`text-white/50 flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 pl-[3.75rem] text-sm text-white/50 leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Reveal-on-scroll hook using IntersectionObserver. */
function useRevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('active')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}
