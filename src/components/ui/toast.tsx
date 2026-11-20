'use client'

import { useCallback, useState, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

import { createContext, useContext } from 'react'

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'animate-pop flex items-center gap-3 rounded-xl border px-5 py-3.5 min-w-[280px] max-w-sm shadow-2xl backdrop-blur-xl',
              t.type === 'success' &&
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
              t.type === 'error' &&
                'bg-rose-500/10 border-rose-500/30 text-rose-300',
              t.type === 'info' &&
                'bg-white/5 border-white/15 text-white'
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={18} className="flex-shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle size={18} className="flex-shrink-0" />
            ) : (
              <Info size={18} className="flex-shrink-0" />
            )}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { toast: () => {} }
  return ctx
}
