'use client'

import * as React from 'react'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={twMerge(
      'flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 transition-all focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
