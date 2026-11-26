import { useSyncExternalStore } from 'react'

// First-visit flags (What's new, dashboard tour). Read lazily so `?reset` (store.ts) clears them.
export const SEEN_KEY = 'roozfir:seen:v1'
let cache: Record<string, boolean> | undefined
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
function read(): Record<string, boolean> {
  if (!cache) { try { cache = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') } catch { cache = {} } }
  return cache!
}
export function markSeen(key: string) {
  cache = { ...read(), [key]: true }
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(cache)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
export const useSeen = (key: string) => useSyncExternalStore(subscribe, () => !!read()[key])
