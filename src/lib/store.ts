import { useSyncExternalStore } from 'react'
import { seed, type AppState } from './seed'

const DATA_KEY = 'roozfir:data:v1'
const SESSION_KEY = 'roozfir:session:v1'

function safeGet(key: string): string | null { try { return localStorage.getItem(key) } catch { return null } }
function safeSet(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* ignore */ }
}

// `?reset` in the URL reseeds the demo data and signs out.
function consumeReset(): boolean {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('reset')) return false
  safeSet(DATA_KEY, null)
  safeSet(SESSION_KEY, null)
  url.searchParams.delete('reset')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  return true
}

function load(): AppState {
  consumeReset()
  const raw = safeGet(DATA_KEY)
  if (raw) { try { return { ...seed(), ...JSON.parse(raw) } } catch { /* reseed */ } }
  const fresh = seed()
  safeSet(DATA_KEY, JSON.stringify(fresh))
  return fresh
}

let state: AppState = load()
let session: { email: string } | null = (() => { try { return JSON.parse(safeGet(SESSION_KEY) ?? 'null') } catch { return null } })()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const emit = () => listeners.forEach((l) => l())

export function update(fn: (s: AppState) => AppState | void): void {
  const draft = structuredClone(state)
  state = fn(draft) ?? draft
  safeSet(DATA_KEY, JSON.stringify(state))
  emit()
}
export const getState = () => state
export const useStore = (): AppState => useSyncExternalStore(subscribe, () => state)
export const useSession = () => useSyncExternalStore(subscribe, () => session)

export function signIn(email: string): void { session = { email }; safeSet(SESSION_KEY, JSON.stringify(session)); emit() }
export function signOut(): void { session = null; safeSet(SESSION_KEY, null); emit() }
