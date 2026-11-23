'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AppNotification {
  id: string
  type: 'deposit' | 'send' | 'system' | 'price'
  title: string
  message: string
  created_at: number
  read: boolean
}

const STORAGE_KEY = 'bw_notifications'
const MAX_NOTIFICATIONS = 50

function load(): AppNotification[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppNotification[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return []
}

function save(notifs: AppNotification[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
  } catch {
    // ignore
  }
}

export type NotificationType = 'deposit' | 'send' | 'system' | 'price'

/** Which notification categories the user wants enabled. */
export interface NotificationPreferences {
  lowBalance: boolean
  depositReceived: boolean
  withdrawalSent: boolean
  priceAlert: boolean
}

const PREF_KEY = 'bw_notif_prefs'

export const DEFAULT_PREFS: NotificationPreferences = {
  lowBalance: true,
  depositReceived: true,
  withdrawalSent: true,
  priceAlert: true,
}

export function loadPreferences(): NotificationPreferences {
  try {
    const raw = window.localStorage.getItem(PREF_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePreferences(p: NotificationPreferences) {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

/**
 * A push() that respects the user's preferences. The `category` maps a
 * notification type to the relevant preference toggle.
 */
function shouldSend(
  category: keyof NotificationPreferences,
  prefs: NotificationPreferences
): boolean {
  return prefs[category]
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS)

  useEffect(() => {
    setNotifications(load())
    setPrefs(loadPreferences())
  }, [])

  const updatePrefs = useCallback((patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePreferences(next)
      return next
    })
  }, [])

  const push = useCallback(
    (n: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => {
      // Map the notification type to a preference category.
      const category: keyof NotificationPreferences | null =
        n.type === 'deposit'
          ? 'depositReceived'
          : n.type === 'send'
          ? 'withdrawalSent'
          : n.type === 'price'
          ? 'priceAlert'
          : null
      // System notifications (low-balance) are matched by title prefix.
      const isLowBalance =
        category === null && n.title.toLowerCase().includes('low')
      if (category && !shouldSend(category, prefs)) return
      if (isLowBalance && !prefs.lowBalance) return

      const notif: AppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: Date.now(),
        read: false,
      }
      setNotifications((prev) => {
        const next = [notif, ...prev].slice(0, MAX_NOTIFICATIONS)
        save(next)
        return next
      })
    },
    [prefs]
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      save(next)
      return next
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      save(next)
      return next
    })
  }, [])

  const unread = notifications.filter((n) => !n.read).length

  return {
    notifications,
    push,
    markAllRead,
    markRead,
    unread,
    prefs,
    updatePrefs,
  }
}
