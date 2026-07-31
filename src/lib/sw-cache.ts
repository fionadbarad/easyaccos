/**
 * Ask the service worker to drop every cache it holds.
 *
 * The worker caches public HTML and static assets to keep the app usable
 * offline. None of that is user data — private routes (/dashboard, /auth,
 * /api) are never written to a cache — but a signed-in session can still leave
 * traces in the shared caches, and on a shared device the next person should
 * not inherit them. Sign-out therefore purges the lot; everything in there is
 * re-fetchable, so throwing it away only ever costs one round-trip.
 *
 * Resolves when the worker confirms, or after `timeoutMs` if it does not
 * answer (no worker registered, an older worker without the message handler,
 * or a controller that is still activating). Sign-out must never be blocked by
 * a cache purge, so a missing answer is treated as done rather than as an
 * error to surface.
 */
export function clearServiceWorkerCaches(timeoutMs = 1_500): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve()
  }
  const controller = navigator.serviceWorker.controller
  if (!controller) return Promise.resolve()

  return new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      navigator.serviceWorker.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve()
    }

    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'EA_CACHES_CLEARED') done()
    }

    const timer = setTimeout(done, timeoutMs)
    navigator.serviceWorker.addEventListener('message', onMessage)

    try {
      controller.postMessage({ type: 'EA_CLEAR_CACHES' })
    } catch {
      done()
    }
  })
}
