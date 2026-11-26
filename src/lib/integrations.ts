import { useSyncExternalStore } from 'react'
import flags from '../config/flags.json'

export type VendorId = 'google' | 'slack' | 'xero'
export interface Vendor { id: VendorId; name: string; blurb: string; authorizeUrl: string }

const REDIRECT = 'https://app.roozfir.online/integrations/callback'
// Real vendor authorize endpoints with a fake client id: the vendor shows its own error page, so a visitor can never complete a connection.
export const VENDORS: Vendor[] = [
  {
    id: 'google', name: 'Google Calendar', blurb: 'Import meetings from your calendar as time entries.',
    authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=000000000000-roozfirdemo0000000000000000.apps.googleusercontent.com&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&redirect_uri=${REDIRECT}`,
  },
  {
    id: 'slack', name: 'Slack', blurb: 'Send project and invoice notifications to a channel.',
    authorizeUrl: `https://slack.com/oauth/v2/authorize?client_id=0000000000.0000000000&scope=chat:write&redirect_uri=${REDIRECT}`,
  },
  {
    id: 'xero', name: 'Xero', blurb: 'Sync your invoices to your accounting software.',
    authorizeUrl: `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=00000000000000000000000000000000&scope=openid%20accounting.transactions&redirect_uri=${REDIRECT}`,
  },
]
export const vendor = (id: VendorId) => VENDORS.find((v) => v.id === id)!

/** Where the list of integrations lives in the current layout. */
export const integrationsPath = () => (flags.connectedAppsInSettings ? '/settings/connected-apps' : '/integrations')

const KEY = 'roozfir:connected:v1'
const safeGet = (): string | null => { try { return localStorage.getItem(KEY) } catch { return null } }
const safeSet = (v: string | null) => { try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v) } catch { /* ignore */ } }

const parse = (raw: string | null): VendorId[] => (raw ?? '').split(',').map((s) => s.trim()).filter((s): s is VendorId => VENDORS.some((v) => v.id === s))

// Hidden switch for taking screenshots: any page opened with ?demo-connected=google,slack,xero makes those integrations look connected.
// ?demo-connected=none clears it. Nothing in the app links here or documents it.
function consumeDemoParam(): void {
  if (typeof window === 'undefined') return
  const raw = new URLSearchParams(window.location.search).get('demo-connected')
  if (raw === null) return
  safeSet(raw.trim() === '' || raw.trim() === 'none' ? null : parse(raw).join(','))
}
consumeDemoParam()

let connected: VendorId[] = parse(safeGet())
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const snapshot = () => connected.join(',')
export function useConnected(): VendorId[] { useSyncExternalStore(subscribe, snapshot); return connected }
export const useIsConnected = (id: VendorId) => useConnected().includes(id)
export function disconnect(id: VendorId) {
  connected = connected.filter((x) => x !== id)
  safeSet(connected.length ? connected.join(',') : null)
  listeners.forEach((l) => l())
}
