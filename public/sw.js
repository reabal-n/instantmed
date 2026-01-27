/**
 * InstantMed Service Worker
 * 
 * Provides offline support for intake forms by caching critical assets
 * and serving cached responses when the network is unavailable.
 */

const CACHE_NAME = 'instantmed-v1';
const STATIC_CACHE_NAME = 'instantmed-static-v1';

// Critical assets to cache for offline use
const STATIC_ASSETS = [
  '/offline',
  '/favicon.ico',
  '/logo.png',
];

// API routes that can be cached for short periods
const CACHEABLE_API_ROUTES = [
  '/api/services',
  '/api/medications',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('instantmed-') && name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Skip Supabase and external API requests
  if (url.hostname.includes('supabase') || url.hostname.includes('stripe')) return;
  
  // Handle API requests with stale-while-revalidate
  if (CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  
  // Handle page navigation with network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }
  
  // Default: network first with cache fallback for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(cacheFirst(event.request));
  }
});

// Network first with offline fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses for offline
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Fall back to offline page
    return caches.match('/offline');
  }
}

// Stale while revalidate for API requests
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Cache first for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.tag || 'instantmed-notification',
      data: {
        url: data.url || '/patient',
        intakeId: data.intakeId,
      },
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'InstantMed', options)
    );
  } catch (_error) {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification('InstantMed', {
        body: event.data.text(),
        icon: '/logo.png',
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/patient';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
