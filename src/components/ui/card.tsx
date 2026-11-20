'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cardVariants = cva(
  'rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-6 transition-all hover:border-white/20',
  {
    variants: {
      variant: {
        default: 'bg-black/50',
        elevated: 'bg-black/70 shadow-xl shadow-black/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={twMerge(cardVariants({ variant, className }))} {...props} />
))
Card.displayName = 'Card'

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={twMerge('flex flex-col space-y-1.5', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={twMerge('text-2xl font-semibold text-white tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge('text-sm text-white/60', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={twMerge('mt-2', className)} {...props} />
))
CardContent.displayName = 'CardContent'

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge('mt-6 flex items-center gap-4', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
