// ============================================================
//  SERVICE WORKER — offline caching for Avani app
// ============================================================

const CACHE_NAME = 'avani-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/auth.js',
  './js/drive.js',
  './js/ui.js',
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

// Install — cache all app files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  // Skip Google API calls — those need the network
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com') ||
      e.request.url.includes('gstatic.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => {
        // If both cache and network fail, return the app shell
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
