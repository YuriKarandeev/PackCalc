// ============================================================
// Service Worker для PWA "Калькулятор упаковки"
// ============================================================
const CACHE_NAME = 'packcalc-v2';   // ← поднимаем версию

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://unpkg.com/three@0.128.0/build/three.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Не всё удалось закэшировать:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Firestore — только сеть
  if (req.url.includes('firestore.googleapis.com') ||
      req.url.includes('firebaseio.com')) {
    return;
  }
  if (req.method !== 'GET') return;

  // HTML и сам SW — сначала сеть, потом кэш
  const isHTML = req.url.endsWith('/') || req.url.endsWith('index.html');
  const isSW = req.url.endsWith('sw.js');

  if (isHTML || isSW) {
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Остальное — сначала кэш, потом сеть
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req));
    })
  );
});