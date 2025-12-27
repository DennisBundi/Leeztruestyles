// Service Worker for Leeztruestyles PWA
const CACHE_NAME = 'leeztruestyles-v1';

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
  // Don't wait for caching - activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Only cache manifest during install - pages are cached on-demand
      return cache.add('/manifest.json').catch(() => {
        console.warn('Failed to cache manifest during install');
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // CRITICAL FIX: Skip navigation requests (page loads/redirects)
  // Let the browser handle page navigation normally
  // This prevents the service worker from interfering with redirects
  if (event.request.mode === 'navigate') {
    return; // Don't intercept - let browser handle it
  }

  // Only handle static assets (images, CSS, JS, fonts, etc.)
  // Skip API calls and HTML pages
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/_next/data/')) {
    return; // Don't cache API responses or Next.js data
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return cached response
      if (response) {
        return response;
      }

      // Cache miss - fetch from network
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest, {
        redirect: 'follow', // Allow redirects to be followed
      }).then((response) => {
        // Don't cache redirects or error responses
        if (response.redirected || response.type === 'opaqueredirect') {
          return response;
        }

        // Only cache successful responses (200 status)
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it's a stream
        const responseToCache = response.clone();

        // Cache the response in the background
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Network error - return error response
        // Static assets might be available offline if cached
        return new Response('Network error', { 
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
