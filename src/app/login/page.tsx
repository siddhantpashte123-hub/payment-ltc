'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, Coins, Lock, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 grid-bg" />
      <div className="fixed inset-0 -z-10 vignette pointer-events-none" />
      <div className="fixed top-1/4 left-[10%] w-72 h-72 bg-white/5 rounded-full blur-[120px] pointer-events-none animate-float-slow" />
      <div className="fixed bottom-1/4 right-[10%] w-80 h-80 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none animate-float" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-black text-3xl font-bold mx-auto mb-4 animate-float">
            L
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to Lumen</h1>
          <p className="text-white/50 mt-2">
            Sign in with Google to access your Litecoin wallet.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="glass-panel p-8 rounded-3xl tilt-card">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
              <span className="text-xs text-rose-300">{error}</span>
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.76 3.28-8.09m-6.86 0c0-2.64-2.06-4.78-4.78-4.78-2.64 0-4.78 2.14-4.78 4.78 0 2.64 2.14 4.78 4.78 4.78 2.64 0 4.78-2.14 4.78-4.78m-7.84 2.46c0-.81.08-1.6.23-2.37H2.27v2.81h3.22c-.25.66-.4 1.39-.4 2.16 0 1.61.89 3.09 2.23 4.02v2.78h3.58c-1.75-1.56-2.85-3.96-2.85-6.57z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Trust badges */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span className="text-[10px] text-white/40">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Coins size={18} className="text-emerald-400" />
                <span className="text-[10px] text-white/40">0% Fee</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Lock size={18} className="text-emerald-400" />
                <span className="text-[10px] text-white/40">Private</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-white/40 text-center">
            Google-only authentication. Securely powered by Supabase.
          </p>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[11px] text-white/50 mx-auto">
          <Sparkles size={12} className="text-emerald-400" />
          No email or password — just your Google account.
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-white/40 hover:text-white transition-colors">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
