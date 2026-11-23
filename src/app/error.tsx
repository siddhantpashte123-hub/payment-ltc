'use client'

import { useEffect } from 'react'

/**
 * Global error boundary (App Router). Catches render/runtime errors on ANY
 * route so users see a friendly, on-brand message instead of the raw
 * "This page couldn't load" crash page. The `reset` action re-runs the
 * route's render, which is what the Reload button does.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('page error:', error)
  }, [error])

  const msg = error?.message || String(error)
  const digest = error?.digest

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 grid-bg" />
      <div className="fixed inset-0 -z-10 vignette pointer-events-none" />
      <div className="fixed top-1/4 left-[10%] w-72 h-72 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-[10%] w-80 h-80 bg-rose-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-black text-4xl font-bold mx-auto mb-6">
          B
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-3">
          Something went wrong
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-4">
          This page hit an unexpected error. This is usually temporary — try
          reloading, or head back to your wallet.
        </p>

        {/* TEMP diagnostic: surface the real error so it can be diagnosed. */}
        <div className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 mb-6 text-left">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Error detail (diagnostic)
          </p>
          <p className="text-xs text-amber-300 break-words font-mono whitespace-pre-wrap">
            {msg}
            {digest ? `\ndigest: ${digest}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="glass-btn px-6 py-3 text-sm font-semibold"
          >
            Reload
          </button>
          <a
            href="/"
            className="px-6 py-3 text-sm font-semibold text-white/60 hover:text-white transition-colors"
          >
            Back
          </a>
        </div>
      </div>
    </div>
  )
}
