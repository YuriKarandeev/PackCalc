// ============================================================
// Service Worker для PWA "Калькулятор упаковки"
// ============================================================
const CACHE_NAME = 'packcalc-v1';

// Что кэшировать сразу при установке
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://unpkg.com/three@0.128.0/build/three.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
];

// Установка — кэшируем основные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Не всё удалось закэшировать:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Перехват запросов — сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  const req = event.request;

  // Не кэшируем запросы к Firestore (они должны идти в сеть)
  if (req.url.includes('firestore.googleapis.com') ||
      req.url.includes('firebaseio.com')) {
    return;
  }

  // POST/PUT/DELETE не кэшируем
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Кэшируем успешные GET-запросы
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => {
        // Если сеть недоступна — ищем в кэше ещё раз
        return caches.match(req);
      });
    })
  );
});
