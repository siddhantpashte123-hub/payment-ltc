'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AppNotification {
  id: string
  type: 'deposit' | 'send' | 'system'
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

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    setNotifications(load())
  }, [])

  const push = useCallback((n: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => {
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
  }, [])

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

  return { notifications, push, markAllRead, markRead, unread }
}
