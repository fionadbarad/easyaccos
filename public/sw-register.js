// Service worker registration — skipped on localhost, and deferred until the
// page is idle. This replaces the PWARegister component to avoid a client-side
// React render.
//
// NOTE: files in /public are served verbatim and never go through the bundler,
// so `process.env.NODE_ENV` is not defined here. Referencing it threw a
// ReferenceError on every page load, which meant the service worker was never
// registered at all. Local development is detected from the hostname instead.
;(function () {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  if (isLocal) return

  const register = function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
      // Silently ignore — SW registration is progressive enhancement.
    })
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
})()
