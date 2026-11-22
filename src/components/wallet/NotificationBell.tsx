'use client'

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNotifications, type AppNotification } from '@/lib/notifications'

const ICONS: Record<AppNotification['type'], string> = {
  deposit: '🟢',
  send: '🔵',
  system: '🟣',
}

export function NotificationBell() {
  const { notifications, unread, markAllRead, markRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell size={18} className="text-white/70" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-white/40">
                  No notifications yet
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 flex gap-3 ${
                      n.read ? 'opacity-60' : 'bg-white/[0.03]'
                    }`}
                  >
                    <span className="text-lg leading-none">{ICONS[n.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{n.title}</p>
                      <p className="text-xs text-white/50 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
