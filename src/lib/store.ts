import { useSyncExternalStore } from 'react'
import { seed, PLANS, MID_PLAN, type AppState } from './seed'
import flags from '../config/flags.json'
import { CONSENT_KEY } from './consent'
import { SEEN_KEY } from './seen'
import { sendChanges } from './server'

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
  safeSet(CONSENT_KEY, null)
  safeSet(SEEN_KEY, null)
  url.searchParams.delete('reset')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  return true
}

function load(): AppState {
  consumeReset()
  const raw = safeGet(DATA_KEY)
  if (raw) {
    try {
      const st = { ...seed(), ...JSON.parse(raw) } as AppState
      if (!PLANS.some((x) => x.name === st.plan)) st.plan = MID_PLAN // plan names change with flags.planGates
      return st
    } catch { /* reseed */ }
  }
  const fresh = seed()
  safeSet(DATA_KEY, JSON.stringify(fresh))
  return fresh
}

let state: AppState = load()
const SESSION_TTL = 30 * 60 * 1000 // flags.sessionExpiry: signed out after 30 minutes
let expired = false
let session: { email: string; at: number } | null = (() => {
  try {
    const v = JSON.parse(safeGet(SESSION_KEY) ?? 'null')
    if (!v) return null
    if (flags.sessionExpiry && Date.now() - (v.at ?? 0) > SESSION_TTL) { safeSet(SESSION_KEY, null); expired = true; return null }
    return { email: v.email, at: v.at ?? Date.now() }
  } catch { return null }
})()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const emit = () => listeners.forEach((l) => l())

export function update(fn: (s: AppState) => AppState | void): void {
  const prev = state
  const draft = structuredClone(state)
  state = fn(draft) ?? draft
  safeSet(DATA_KEY, JSON.stringify(state))
  sendChanges(prev, state) // flags.serverSaves
  emit()
}
export const getState = () => state
export const useStore = (): AppState => useSyncExternalStore(subscribe, () => state)
export const useSession = () => useSyncExternalStore(subscribe, () => session)

export function signIn(email: string): void { expired = false; session = { email, at: Date.now() }; safeSet(SESSION_KEY, JSON.stringify(session)); emit() }
export function signOut(): void { session = null; safeSet(SESSION_KEY, null); emit() }
export const useExpired = () => useSyncExternalStore(subscribe, () => expired)
/** Called on a timer when flags.sessionExpiry is on. */
export function checkSessionExpiry(): void {
  if (session && Date.now() - session.at > SESSION_TTL) { session = null; expired = true; safeSet(SESSION_KEY, null); emit() }
}
