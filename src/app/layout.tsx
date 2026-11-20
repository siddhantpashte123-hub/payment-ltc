import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

const SITE_URL = 'https://payment-ltc.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lumen | Premium Litecoin Wallet — 0% Platform Fee',
    template: '%s | Lumen',
  },
  description:
    'Lumen is a premium black-and-white Litecoin wallet. Deposit and send LTC with a unique on-chain address per user, real blockchain deposits & sends, and 0% platform fee. Google sign-in, Supabase backend.',
  keywords: [
    'Litecoin wallet',
    'LTC wallet',
    'Litecoin',
    'LTC deposit',
    'send Litecoin',
    'crypto wallet',
    'premium wallet',
    '0% fee wallet',
    'Lumen',
  ],
  authors: [{ name: 'Lumen' }],
  creator: 'Lumen',
  applicationName: 'Lumen',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Lumen',
    title: 'Lumen | Premium Litecoin Wallet — 0% Platform Fee',
    description:
      'A premium black-and-white Litecoin wallet. Deposit and send LTC with a unique on-chain address, real blockchain transactions, and 0% platform fee.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lumen — Premium Litecoin Wallet',
      },
      {
        url: '/brand-mark.png',
        width: 512,
        height: 512,
        alt: 'Lumen logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumen | Premium Litecoin Wallet — 0% Platform Fee',
    description:
      'A premium black-and-white Litecoin wallet. Deposit and send LTC with 0% platform fee.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/brand-mark.png',
    shortcut: '/brand-mark.png',
    apple: '/brand-mark.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
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
