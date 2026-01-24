// 1. VERSIONING: Incremented to force an app-wide update
const STATIC_CACHE = 'realtravo-static-v11'; 
const IMAGE_CACHE = 'realtravo-images-v11';
const DATA_CACHE = 'realtravo-data-v11';

// 2. PRECACHE LIST: The App Shell + All Routes (start_url aligned with manifest.json)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/fulllogo.png',
  '/favicon.ico',
  
  // Local Images (WebP for better performance)
  '/images/category-campsite.webp',
  '/images/category-hotels.webp',
  '/images/category-trips.webp',
  '/images/category-events.webp',
  '/images/hero-background.webp',
  
  // Audio
  '/audio/notification.mp3',
  
  // Routes (aligned with start_url: "/")
  '/auth',
  '/about',
  '/contact',
  '/saved',
  '/bookings',
  '/install',
  '/terms-of-service',
  '/privacy-policy',
  '/qr-scanner',
  '/profile',
  '/profile/edit',
  '/account',
  '/my-referrals',
  '/payment',
  '/payment-history',
  '/reset-password',
  '/verify-email',
  '/forgot-password',
  '/become-host',
  '/creator-dashboard',
  '/my-listing',
  '/host-verification',
  '/verification-status',
  '/create-trip',
  '/create-hotel',
  '/create-adventure',
  '/create-attraction',
  '/host/trips',
  '/host/hotels',
  '/host/experiences',
  '/host-bookings',
  '/admin',
  '/admin/pending',
  '/admin/approved',
  '/admin/rejected',
  '/admin/bookings',
  '/admin/all-bookings',
  '/admin/verification',
  '/admin/payment-verification',
  '/admin/referral-settings'
];

const IMAGE_PATTERNS = [
  /supabase\.co\/storage\/v1\/object\/public\//,
  /images\.unsplash\.com/,
];

// --- INSTALL: Pre-cache core assets for instant loading ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('RealTravo PWA: Pre-caching core assets...');
      // Cache all assets, but don't fail installation if some fail
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn("Pre-cache failed for some assets:", err);
      });
    })
  );
  // FIX #3: skipWaiting() ensures updates take effect immediately
  self.skipWaiting();
});

// --- ACTIVATE: Cleanup old caches and claim clients immediately ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, IMAGE_CACHE, DATA_CACHE].includes(key)) {
            console.log('RealTravo PWA: Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // FIX #3: clients.claim() makes new SW take control immediately
  self.clients.claim();
});

// --- FETCH: Stale-While-Revalidate Strategy for instant loading ---
// FIX #1: Cache-First with background update (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (like POST for database updates)
  if (event.request.method !== 'GET') return;

  // Skip Supabase API calls - always fetch fresh data
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Start the network fetch in background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const isImage = IMAGE_PATTERNS.some(p => p.test(url.href)) || event.request.destination === 'image';
          
          let cacheName = STATIC_CACHE;
          if (isImage) {
            cacheName = IMAGE_CACHE;
          }

          const responseClone = networkResponse.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // OFFLINE FALLBACK: 
        // If navigation fails (user is offline), return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // Return cached response if network fails
        return cachedResponse;
      });

      // FIX #1: Return cached response immediately (stale), update in background (revalidate)
      // This ensures instant loading on repeat visits
      return cachedResponse || fetchPromise;
    })
  );
});

// --- PUSH NOTIFICATIONS ---
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'New update from RealTravo',
    icon: '/fulllogo.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'RealTravo', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
