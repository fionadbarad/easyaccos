// EasyAcco service worker — lightweight offline shell.
// Cache strategy: network-first for pages (always try fresh), cache-first for static assets.

const VERSION = 'easyacco-v1'
const CORE_CACHE = `${VERSION}-core`
const RUNTIME = `${VERSION}-runtime`

const CORE_ASSETS = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((c) => c.addAll(CORE_ASSETS))
      .catch(() => null),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Network-first for HTML navigations.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(RUNTIME)
            .then((c) => c.put(req, copy))
            .catch(() => null)
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    )
    return
  }

  // Cache-first for everything else (built assets, fonts, images).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches
              .open(RUNTIME)
              .then((c) => c.put(req, copy))
              .catch(() => null)
          }
          return res
        })
        .catch(() => cached)
    }),
  )
})
