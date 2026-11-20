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
              ₿
            </div>
            <span className="premium-text">LTC Vault</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
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
                Vault
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
                    ₿
                  </div>
                  <span className="font-bold">LTC Vault</span>
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
      </main>

      <footer className="border-t border-white/10 bg-black py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="font-bold text-white">LTC Vault</span> · Premium Litecoin Wallet
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
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
