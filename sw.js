/* =========================================================
   SERVICE WORKER — полный офлайн-режим (PWA)
   ========================================================= */

const CACHE_NAME = 'be-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './src/main.js',
  './src/data.js',
  './src/utils.js',
  './src/state.js',
  './src/share.js',
  './src/globe.js',
  './src/panel.js',
  './src/ui.js',
  './src/cart.js',
  './favicon.ico',
  './og-cover.jpg',
  'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css',
  'https://unpkg.com/three@0.160.0/build/three.module.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('mc.yandex.ru')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request).then((res) => {
        if (e.request.url.includes('/assets/')) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});