const CACHE_NAME = 'presuply-v1'
const OFFLINE_URL = '/offline.html'

// Assets estáticos a cachear en install
const PRECACHE_URLS = [OFFLINE_URL]

// ── Install: precachear offline fallback ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: limpiar cachés de versiones anteriores ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function shouldSkip(request) {
  const url = new URL(request.url)

  // Saltar peticiones no-GET
  if (request.method !== 'GET') return true

  // Saltar Supabase
  if (url.hostname.includes('supabase.co')) return true

  // Saltar API y auth de Next.js
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return true

  // Saltar extensiones de Chrome y recursos externos no relevantes
  if (!url.protocol.startsWith('http')) return true

  return false
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)
  )
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (shouldSkip(event.request)) return

  const url = new URL(event.request.url)

  if (isStaticAsset(url)) {
    // Cache-first para assets estáticos
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first para navegación (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then(cached => {
            if (cached) return cached
            return caches.match(OFFLINE_URL)
          })
        )
    )
    return
  }
})
