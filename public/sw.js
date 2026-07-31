// EasyAcco service worker — lightweight offline shell.
//
// Three rules, in the order the fetch handler applies them:
//   1. Private routes (/dashboard, /auth, /api) are NEVER written to a cache.
//   2. Content-hashed build output (/_next/static) is cache-first and immutable.
//   3. Everything else same-origin is stale-while-revalidate.
//
// WHY THIS SHAPE — the previous version got three things wrong:
//
//   * It cached HTML navigations for EVERY same-origin route, /dashboard
//     included, and nothing ever purged them. On a shared browser the next
//     person to open the app offline was served the previous user's dashboard
//     out of the cache. Authenticated responses are now never stored, and a
//     message handler lets the app drop the caches outright on sign-out.
//
//   * VERSION was a hardcoded constant, and `activate` only deletes caches
//     whose key does NOT start with it. Since it never changed, the runtime
//     cache accumulated across every deploy and nothing in it was ever
//     evicted — cache-first then pinned those entries forever.
//
//   * Cache-first was applied to every non-navigation GET. That is correct for
//     /_next/static, whose filenames carry a content hash, and wrong for
//     everything else in /public (icons, the manifest, sw-register.js), which
//     keep stable URLs across deploys and so could never be updated. Those are
//     now revalidated in the background.
//
// Bump VERSION to force a clean slate for all clients on the next deploy.
const VERSION = 'easyacco-v2'
const CORE_CACHE = `${VERSION}-core`
const RUNTIME = `${VERSION}-runtime`

const CORE_ASSETS = ['/', '/manifest.webmanifest']

// Anything that is, or could be, specific to a signed-in user. Responses for
// these are passed straight through and never written to a cache.
const PRIVATE_PATH = /^\/(dashboard|auth|api)(\/|$)/

// Content-hashed build output: a given URL's bytes can never change, so it is
// safe to serve from cache indefinitely without revalidation.
const IMMUTABLE_PATH = /^\/_next\/static\//

function isCacheableResponse(res) {
  // `basic` excludes opaque cross-origin responses; 200 excludes partial
  // content and redirects, neither of which replays correctly from a cache.
  return res && res.ok && res.status === 200 && res.type === 'basic'
}

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
      )
      .then(() => self.clients.claim()),
  )
})

// Sign-out hook. The app posts { type: 'EA_CLEAR_CACHES' } so nothing cached
// while one account was signed in outlives that session on a shared device.
// Everything here is re-fetchable, so dropping all of it is always safe.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'EA_CLEAR_CACHES') return
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => {
        // Tell the caller it is done, so sign-out can await the purge rather
        // than navigating away mid-delete.
        if (event.source) event.source.postMessage({ type: 'EA_CACHES_CLEARED' })
      })
      .catch(() => null),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isPrivate = PRIVATE_PATH.test(url.pathname)

  // ── HTML navigations ─────────────────────────────────────────────────────
  if (req.mode === 'navigate') {
    if (isPrivate) {
      // Network only. If the network is gone we fall back to the PUBLIC shell
      // rather than a stored copy of the private page — an offline dashboard is
      // worth less than the guarantee that one user's page is never replayed
      // to the next person on this device.
      event.respondWith(fetch(req).catch(() => caches.match('/')))
      return
    }
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isCacheableResponse(res)) {
            const copy = res.clone()
            caches
              .open(RUNTIME)
              .then((c) => c.put(req, copy))
              .catch(() => null)
          }
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    )
    return
  }

  // ── Sub-resources ────────────────────────────────────────────────────────
  if (isPrivate) return // API calls and private assets: straight to the network.

  // Immutable build output: cache-first, no revalidation.
  if (IMMUTABLE_PATH.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (isCacheableResponse(res)) {
              const copy = res.clone()
              caches
                .open(RUNTIME)
                .then((c) => c.put(req, copy))
                .catch(() => null)
            }
            return res
          }),
      ),
    )
    return
  }

  // Everything else: stale-while-revalidate. Serve the cached copy at once,
  // and refresh it in the background so a stable URL whose CONTENT changed
  // (icons, the manifest) is picked up on the next load instead of never.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (isCacheableResponse(res)) {
            const copy = res.clone()
            caches
              .open(RUNTIME)
              .then((c) => c.put(req, copy))
              .catch(() => null)
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
