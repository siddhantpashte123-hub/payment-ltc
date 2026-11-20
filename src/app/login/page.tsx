'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-black text-2xl mx-auto mb-4">
            ₿
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to LTC Vault</h1>
          <p className="text-white/50 mt-2">
            Sign in with Google to access your Litecoin wallet.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
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
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.76 3.28-8.09m-6.86 0c0-2.64-2.06-4.78-4.78-4.78-2.64 0-4.78 2.14-4.78 4.78 0 2.64 2.14 4.78 4.78 4.78 2.64 0 4.78-2.14 4.78-4.78m-7.84 2.46c0-.81.08-1.6.23-2.37H2.27v2.81h3.22c-.25.66-.4 1.39-.4 2.16 0 1.61.89 3.09 2.23 4.02v2.78h3.58c-1.75-1.56-2.85-3.96-2.85-6.57z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          <p className="mt-6 text-xs text-white/40 text-center">
            Google-only authentication. Securely powered by Supabase.
          </p>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-white/40">
            No email or password — just your Google account.
          </p>
        </div>
      </div>
    </div>
  )
}
