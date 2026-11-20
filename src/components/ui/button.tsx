'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-white text-black shadow-sm hover:bg-gray-100 hover:translate-y-[-1px] active:translate-y-0',
        ghost:
          'bg-transparent border border-white/10 text-white hover:bg-white/10 hover:translate-y-[-1px] active:translate-y-0',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 hover:translate-y-[-1px] active:translate-y-0',
        outline:
          'border border-white/20 text-white hover:bg-white/10 hover:translate-y-[-1px] active:translate-y-0',
        secondary:
          'bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:translate-y-[-1px] active:translate-y-0',
      },
      size: {
        default: 'h-11 px-4 py-3',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        full: 'w-full h-11 px-4 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={twMerge(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants, Button }
