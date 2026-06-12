// ============================================================
//  SERVICE WORKER — offline caching for Avani app
// ============================================================

const CACHE_NAME = 'avani-v4';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/auth.js',
  './js/drive.js',
  './js/ui.js',
  './js/offline.js',
  './js/app.js',
  './js/pages/dashboard.js',
  './js/pages/inventory.js',
  './js/pages/billing.js',
  './js/pages/vendors.js',
  './js/pages/reports.js',
  './js/pages/sales.js',
  './js/pages/settings.js',
  './manifest.json',
];

// Install — cache all app files fresh
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

// Fetch — network first for JS/CSS (always get latest), cache fallback for offline
self.addEventListener('fetch', e => {
  // Skip Google API calls
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com') ||
      e.request.url.includes('gstatic.com')) {
    return;
  }

  const url = new URL(e.request.url);
  const isAppFile = ASSETS.some(a => url.pathname.endsWith(a.replace('./', '/')));

  if (isAppFile) {
    // Network first for app files — always get latest version
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request)) // Fall back to cache if offline
    );
  } else {
    // Cache first for everything else
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
