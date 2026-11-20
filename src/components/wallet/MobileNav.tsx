'use client'

import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'

/**
 * App-like bottom navigation for mobile on dashboard routes.
 */
export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  const items = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Deposit', icon: ArrowDownLeft, href: '/dashboard/deposit' },
    { label: 'Withdraw', icon: ArrowUpRight, href: '/dashboard/withdraw' },
    { label: 'Activity', icon: Receipt, href: '/dashboard' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors',
                active ? 'text-emerald-400' : 'text-white/40'
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
