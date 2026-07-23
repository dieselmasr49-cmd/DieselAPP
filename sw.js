// ==========================================
// 🔄 Service Worker - PWA
// ==========================================

const CACHE_NAME = 'mappmaster-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/dashboard.html',
  '/pages/blacklist.html',
  '/pages/search.html',
  '/pages/reports.html',
  '/pages/settings.html',
  '/pages/admin.html',
  '/pages/publisher.html',
  '/pages/chat.html',
  '/pages/chat-list.html',
  '/css/shared.css',
  '/css/login.css',
  '/css/dashboard.css',
  '/css/blacklist.css',
  '/css/search.css',
  '/css/reports.css',
  '/css/settings.css',
  '/css/admin.css',
  '/css/publisher.css',
  '/css/chat.css',
  '/css/chat-list.css',
  '/js/shared.js',
  '/js/login.js',
  '/js/dashboard.js',
  '/js/blacklist.js',
  '/js/search.js',
  '/js/reports.js',
  '/js/settings.js',
  '/js/admin.js',
  '/js/publisher.js',
  '/js/chat.js',
  '/js/chat-list.js',
  '/js/session-tracker.js',
  '/js/realtime-handler.js',
  '/manifest.json'
];

// ✅ تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installed!');
        return self.skipWaiting();
      })
  );
});

// ✅ تفعيل الـ Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated!');
        return self.clients.claim();
      })
  );
});

// ✅ التعامل مع الطلبات (Network First - ثم Cache)
self.addEventListener('fetch', (event) => {
  // ✅ تجاهل طلبات Supabase (نشتغل Online)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ✅ تخزين النسخة الجديدة في الكاش
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        return response;
      })
      .catch(() => {
        // ✅ لو النت مقطوع، نجيب من الكاش
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('💾 Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // ✅ لو مش موجود في الكاش، نرجع صفحة Offline
            return caches.match('/pages/dashboard.html');
          });
      })
  );
});

// ✅ التعامل مع الإشعارات (Push Notifications)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📩 MappMaster';
  const options = {
    body: data.body || 'لديك تحديث جديد في النظام',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ✅ عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('🔄 Service Worker loaded!');