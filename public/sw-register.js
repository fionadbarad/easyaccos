// Service worker registration — only runs in production and after page is idle.
// This replaces the PWARegister component to avoid a client-side React render.
(function () {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  const register = function () {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(function () {
        // Silently ignore — SW registration is progressive enhancement.
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
})();
