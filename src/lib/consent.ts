import { useSyncExternalStore } from 'react'

// Cookie consent. The choice lives in localStorage; `?reset` clears it (see store.ts).
export const CONSENT_KEY = 'roozfir:consent:v1'
export interface Consent { analytics: boolean; marketing: boolean }
let cache: Consent | null | undefined // undefined = not read yet (read lazily, after ?reset has run)
let prefsOpen = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

function read(): Consent | null {
  if (cache === undefined) { try { cache = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null') } catch { cache = null } }
  return cache ?? null
}
export function setConsent(c: Consent) { cache = c; try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)) } catch { /* ignore */ } prefsOpen = false; emit() }
export const openPrefs = () => { prefsOpen = true; emit() }
export const closePrefs = () => { prefsOpen = false; emit() }
export function useConsent() {
  const c = useSyncExternalStore(subscribe, () => JSON.stringify(read()))
  const open = useSyncExternalStore(subscribe, () => prefsOpen)
  return { consent: JSON.parse(c) as Consent | null, prefsOpen: open }
}
