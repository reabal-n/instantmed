/* eslint-env serviceworker */
/* global clients */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith('instantmed-')).map((name) => caches.delete(name))
    );
    await self.registration.unregister();
    await clients.claim();
  })());
});
