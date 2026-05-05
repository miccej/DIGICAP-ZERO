// Simple Service Worker to enable PWA installation
const CACHE_NAME = 'digicap-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch
  event.respondWith(fetch(event.request));
});
