'use client'

import { useFiatCurrency } from '@/lib/fiat'

/** INR / USD toggle pill for switching fiat display across the app. */
export function FiatToggle({ className = '' }: { className?: string }) {
  const { currency, setCurrency } = useFiatCurrency()

  return (
    <div className={`inline-flex p-1 rounded-lg bg-white/5 border border-white/10 gap-1 ${className}`}>
      {(['INR', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            currency === c
              ? 'bg-white text-black'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
