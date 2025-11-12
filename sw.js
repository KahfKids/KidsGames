const CACHE_NAME = 'kidsgames-v1.0.1';
const STATIC_CACHE = 'kidsgames-static-v1.0.1';
const GAMES_CACHE = 'kidsgames-games-v1.0.1';
const PREMIUM_CACHE = 'kidsgames-premium-v1.0.1';

// Core files that should be cached immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  // CSS files will be added dynamically
  // JS files will be added dynamically
];

// Game directories to cache on-demand
const GAME_PATHS = [
  '/games/',
  '/premium-games/',
  '/read/'
];

// Premium games secret pattern
const PREMIUM_SECRET_PATTERN = /secret=kahf-kids-games-premium-games-AXjKIWUY/i;

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v1.0.1');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v1.0.1');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== GAMES_CACHE &&
                cacheName !== PREMIUM_CACHE &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external resources
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    // Core assets: Cache First strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isGameAsset(url.pathname)) {
    // Game assets: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, getGameCache(url)));
  } else if (isPremiumGameAsset(url.pathname)) {
    // Premium game assets: Network First (with fallback to cache)
    event.respondWith(networkFirst(request, PREMIUM_CACHE));
  } else {
    // Other assets: Try network first, fallback to cache
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

// Determine if request is for game assets
function isGameAsset(pathname) {
  return GAME_PATHS.some(gamePath => pathname.startsWith(gamePath)) ||
         pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i);
}

// Determine if request is for premium game assets
function isPremiumGameAsset(pathname) {
  return pathname.includes('/premium-games/') ||
         pathname.match(/premium-games/i);
}

// Determine appropriate cache for game assets
function getGameCache(url) {
  if (url.pathname.includes('/premium-games/')) {
    return PREMIUM_CACHE;
  }
  return GAMES_CACHE;
}

// Cache First strategy - for core assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache First failed, returning offline page');
    return getOfflineResponse();
  }
}

// Network First strategy - for dynamic content and premium games
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return getOfflineResponse();
  }
}

// Stale While Revalidate strategy - for game assets
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to fetch in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.log('[SW] Background fetch failed:', error);
    });

  // Return cached version immediately if available
  if (cached) {
    return cached;
  }

  // If no cache, wait for network
  return fetchPromise.catch(() => getOfflineResponse());
}

// Get offline response
function getOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - KidsGames</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ece4d9;
            color: #4f391a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
            padding: 20px;
          }
          .offline-container {
            max-width: 400px;
            background: #eed9bb;
            padding: 40px;
            border-radius: 20px;
            border: 2px solid #4f391a;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          .offline-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            margin-bottom: 16px;
            font-size: 24px;
          }
          p {
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .retry-btn {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
          }
          .retry-btn:hover {
            background: #ff5252;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">🎮</div>
          <h1>You're Offline</h1>
          <p>No internet connection. Some cached games may still be available. Check your connection and try again.</p>
          <button class="retry-btn" onclick="location.reload()">Try Again</button>
        </div>
      </body>
    </html>`,
    {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Background sync for premium game verification
self.addEventListener('sync', (event) => {
  if (event.tag === 'premium-verification') {
    event.waitUntil(verifyPremiumGames());
  }
});

// Verify premium games when back online
async function verifyPremiumGames() {
  try {
    // This would connect to your premium verification service
    console.log('[SW] Verifying premium game access...');
    // Implementation would depend on your authentication system
  } catch (error) {
    console.log('[SW] Premium verification failed:', error);
  }
}

// Push notifications for game updates
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'kidsgames-update',
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(GAMES_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});

console.log('[SW] KidsGames Service Worker v1.0.1 loaded');