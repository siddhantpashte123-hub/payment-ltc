import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, ShieldCheck, Send, Wallet } from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative overflow-hidden">
      {/* Background gradient glow */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
      <div className="fixed top-24 left-[-10%] w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-[-10%] w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="fixed top-0 left-0 w-full z-40 border-b border-white/5 bg-black/40 backdrop-blur-md">
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
            <Link href="/login" className="hidden sm:block">
              <Button size="sm">Sign in with Google</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Hero */}
        <div className="text-center px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-medium uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Mainnet Active
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
            Your <span className="block text-white">Litecoin</span>,{' '}
            <span className="relative">
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-white">
                Vault
              </span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            A clean, premium black-and-white wallet to deposit and send Litecoin.
            Every user gets a unique LTC address, hosted on your own backend with
            Supabase and deployed on Vercel.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                <Sparkles size={20} className="mr-2" />
                Open Wallet
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-24 mb-24">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Premium by design</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
            {[
              {
                icon: <Wallet size={32} className="text-emerald-400" />,
                title: 'Unique LTC Address',
                desc: 'Every user gets their own dedicated Litecoin deposit address.',
              },
              {
                icon: <ShieldCheck size={32} className="text-white" />,
                title: 'Google Sign-In',
                desc: 'Secure authentication with Google only — no passwords to manage.',
              },
              {
                icon: <Send size={32} className="text-white" />,
                title: 'Send & Receive',
                desc: 'Deposit LTC to your address and send to any LTC address.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-panel p-6 hover:border-white/20 transition-all reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
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
        <section id="how-it-works" className="mb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto px-4">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white tracking-tight">How it works</h2>
              <div className="space-y-5">
                {[
                  {
                    num: '01',
                    title: 'Sign in with Google',
                    desc: 'Connect your Google account securely via Supabase Auth.',
                  },
                  {
                    num: '02',
                    title: 'Get your LTC address',
                    desc: 'A unique Litecoin address is created for your account.',
                  },
                  {
                    num: '03',
                    title: 'Deposit & Send',
                    desc: 'Receive LTC or send to any address from your dashboard.',
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
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
            <div className="hidden lg:block">
              <div className="glass-panel p-8 relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-white to-gray-400 rounded-2xl blur opacity-15" />
                <div className="relative p-4 rounded-xl border border-white/10 bg-black/40">
                  <div className="mb-4 flex items-center gap-2 text-emerald-400 text-xs font-medium uppercase tracking-wider">
                    <ShieldCheck size={14} className="mr-1" />
                    Mainnet · LTC
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-white/10 rounded-lg h-3 w-3/4" />
                      <div className="w-1/3 bg-white/10 rounded-lg h-3" />
                    </div>
                    <div className="font-mono text-emerald-400 text-xs select-all break-all mb-4">
                      L…{' '}
                      <span className="opacity-50">abc123def456</span>…{' '}
                      <span className="opacity-50">xyz789</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full">
                      Copy Address
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>LTC Vault</span> · Premium Litecoin Wallet
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
