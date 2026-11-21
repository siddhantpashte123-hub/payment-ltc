'use client'

import { ReactNode, useRef, useState } from 'react'
import { clsx } from 'clsx'

interface BigActionButtonProps {
  children: ReactNode
  subtitle?: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  className?: string
  reveal?: boolean
}

/**
 * Large premium action button with a black → white hover/drag animation:
 * background flips from black to white, a sheen sweep crosses the button,
 * and the cursor leaves a soft radial glow.
 */
export function BigActionButton({
  children,
  subtitle,
  icon,
  onClick,
  href,
  className,
  reveal,
}: BigActionButtonProps) {
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false })
  const ref = useRef<HTMLElement>(null)

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setGlow({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      on: true,
    })
  }

  const handleLeave = () => setGlow((g) => ({ ...g, on: false }))

  const classes = clsx(
    'group relative block w-full overflow-hidden rounded-3xl bg-black text-white',
    'transition-all duration-300 ease-out',
    'hover:bg-white hover:text-black hover:-translate-y-1 hover:shadow-[0_30px_70px_-20px_rgba(255,255,255,0.25)]',
    'active:translate-y-0 active:scale-[0.99]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
    reveal && 'reveal-up',
    className
  )

  const content = (
    <>
      {/* Gradient hairline border */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-80"
        style={{
          padding: '1.5px',
          background:
            'linear-gradient(140deg, rgba(255,255,255,0.55), rgba(255,255,255,0.06) 40%, rgba(52,211,153,0.4))',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* Soft inner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
        style={{
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -24px rgba(0,0,0,0.95)',
        }}
      />
      {/* Cursor radial glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-200"
        style={{
          opacity: glow.on ? 1 : 0,
          background: `radial-gradient(220px circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.18), transparent 60%)`,
        }}
      />
      {/* Sheen sweep on hover */}
      <div className="sheen-sweep" />

      <div className="relative z-10 flex items-center gap-5 px-8 py-8 md:px-10 md:py-10">
        {icon && (
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center transition-colors duration-300 group-hover:bg-black/5 group-hover:border-black/10">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xl font-bold tracking-tight md:text-2xl">
            {children}
          </div>
          {subtitle && (
            <div className="text-sm text-white/50 mt-1 transition-colors duration-300 group-hover:text-black/50">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        ref={ref as React.RefObject<HTMLAnchorElement>}
        className={classes}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      ref={ref as React.RefObject<HTMLButtonElement>}
      className={classes}
    >
      {content}
    </button>
  )
}
