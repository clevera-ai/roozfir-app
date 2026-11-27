// Roozfir's pretend backend (flags.serverSaves). GitHub Pages only serves files, so this service worker answers the
// app's own /api/* requests the way a real server would: 201 for a create (POST), 200 for an update or a delete.
// The data itself still lives in localStorage; this only makes every save a real same-site request on the network,
// as in a product with a backend. Turning the flag off unregisters it (src/lib/server.ts).
const DELAY_MS = 150

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/api/')) return
  event.respondWith(answer(event.request, url))
})

async function answer(request, url) {
  let body = null
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  const method = request.method.toUpperCase()
  const id = body && typeof body === 'object' && !Array.isArray(body) && 'id' in body ? body.id : undefined
  const payload = { ok: true, path: url.pathname, ...(id === undefined ? {} : { id }), saved_at: new Date().toISOString() }
  return new Response(JSON.stringify(payload), {
    status: method === 'POST' ? 201 : 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
