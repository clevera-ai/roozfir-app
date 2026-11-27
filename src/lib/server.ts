import flags from '../config/flags.json'
import type { AppState } from './seed'

/**
 * flags.serverSaves: every change to the data is also sent to the app's own `/api`, one request per changed item
 * (POST /api/<collection> for a new item, PATCH /api/<collection>/<id> for an edit, DELETE for a removal, PATCH
 * /api/<key> for a setting), answered by the service worker in `public/sw.js`. The app keeps working from
 * localStorage whatever the answer is. With the flag off the service worker is unregistered.
 */
export function startServer(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (flags.serverSaves) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* saves then reach GitHub Pages and fail, like a server that is down */ })
  } else {
    navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => { void r.unregister() })).catch(() => {})
  }
}

type Request = { method: 'POST' | 'PATCH' | 'DELETE'; path: string; body?: unknown }
type WithId = { id: string | number }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const isList = (v: unknown): v is WithId[] => Array.isArray(v) && v.every((x) => x !== null && typeof x === 'object' && 'id' in x)

function requests(prev: AppState, next: AppState): Request[] {
  const out: Request[] = []
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof AppState>
  for (const key of keys) {
    const a = prev[key]
    const b = next[key]
    if (same(a, b)) continue
    if (isList(a) && isList(b)) {
      const before = new Map(a.map((x) => [String(x.id), x]))
      const after = new Map(b.map((x) => [String(x.id), x]))
      const start = out.length
      for (const [id, item] of after) {
        if (!before.has(id)) out.push({ method: 'POST', path: `/api/${key}`, body: item })
        else if (!same(before.get(id), item)) out.push({ method: 'PATCH', path: `/api/${key}/${encodeURIComponent(id)}`, body: item })
      }
      for (const id of before.keys()) if (!after.has(id)) out.push({ method: 'DELETE', path: `/api/${key}/${encodeURIComponent(id)}` })
      // only the order changed (a card dragged on the board)
      if (out.length === start) out.push({ method: 'PATCH', path: `/api/${key}`, body: b.map((x) => x.id) })
    } else {
      out.push({ method: 'PATCH', path: `/api/${key}`, body: b ?? null })
    }
  }
  return out
}

/** Resolves once the service worker controls the page (at most 4 s after the first load). */
function controlled(): Promise<void> {
  if (!('serviceWorker' in navigator) || navigator.serviceWorker.controller) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done); resolve() }
    const timer = setTimeout(done, 4000)
    navigator.serviceWorker.addEventListener('controllerchange', done)
  })
}

/** An action that changes no data (resend an invitation, send a test message): one request, when flags.serverSaves is on. */
export function serverAction(method: 'POST' | 'PATCH', path: string, body?: unknown): void {
  if (!flags.serverSaves) return
  void controlled()
    .then(() => fetch(path, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }))
    .catch(() => { /* nothing to keep */ })
}

/** Sends one change (the state before and after one `update`) to the server, in order. */
export function sendChanges(prev: AppState, next: AppState): void {
  if (!flags.serverSaves) return
  const list = requests(prev, next)
  if (!list.length) return
  void (async () => {
    await controlled()
    for (const r of list) {
      try {
        await fetch(r.path, {
          method: r.method,
          ...(r.body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(r.body) }),
        })
      } catch { /* kept locally either way */ }
    }
  })()
}
