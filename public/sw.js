// Service Worker Cache Version - Update this for each deployment
const CACHE_VERSION = 'v2';
const CACHE_NAME = `scviewer-${CACHE_VERSION}`;

/* global clients */

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('scviewer-') && cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first strategy for main app files
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If network request is successful, cache the response
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(e.request);
      })
  );
});
