import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'LTC Vault | Premium Litecoin Wallet',
  description:
    'Deposit and send Litecoin with a secure, black-and-white premium wallet. Each user gets a unique LTC address.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
