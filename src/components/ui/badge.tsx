'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/10 text-white bg-white/5',
        success: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        pending: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
        failed: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={twMerge(badgeVariants({ variant, className }))} {...props} />
))
Badge.displayName = 'Badge'

export { Badge }
