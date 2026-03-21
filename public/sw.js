/**
 * BeerSocial Service Worker
 * Permite funcionamento offline e cache inteligente
 */

const CACHE_NAME = 'beersocial-v1';
const STATIC_CACHE = 'beersocial-static-v1';
const DYNAMIC_CACHE = 'beersocial-dynamic-v1';
const API_CACHE = 'beersocial-api-v1';

// Ficheiros para cache estático (sempre disponíveis offline)
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes para cache com TTL
const API_ROUTES = [
  '/api/beers',
  '/api/reviews',
  '/api/users',
  '/api/status'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar Chrome extensions e outros protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API requests - Network First com fallback de cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Ficheiros estáticos - Cache First
  if (isStaticFile(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Páginas - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache First - para ficheiros estáticos
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

// Network First - para API calls
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Não é possível ligar ao servidor' }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Stale While Revalidate - para páginas
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Verificar se é ficheiro estático
function isStaticFile(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'BeerSocial', body: 'Nova notificação!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já houver uma janela aberta, focá-la
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync para ações offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-reviews') {
    event.waitUntil(syncReviews());
  }
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Sincronizar reviews pendentes
async function syncReviews() {
  try {
    const pendingReviews = await getPendingData('pending-reviews');
    
    for (const review of pendingReviews) {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
    }
    
    await clearPendingData('pending-reviews');
  } catch (error) {
    console.error('[SW] Failed to sync reviews:', error);
  }
}

// Sincronizar mensagens pendentes
async function syncMessages() {
  try {
    const pendingMessages = await getPendingData('pending-messages');
    
    for (const message of pendingMessages) {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    }
    
    await clearPendingData('pending-messages');
  } catch (error) {
    console.error('[SW] Failed to sync messages:', error);
  }
}

// Helpers para IndexedDB (simplificado)
async function getPendingData(storeName) {
  // Implementação seria usar IndexedDB
  return [];
}

async function clearPendingData(storeName) {
  // Implementação seria limpar IndexedDB
  return true;
}

console.log('[SW] Service Worker loaded');
