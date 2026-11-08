const CACHE_NAME = 'kidsgames-v1.4.0';
const STATIC_CACHE = 'kidsgames-static-v1.4.0';
const GAMES_CACHE = 'kidsgames-games-v1.4.0';
const PREMIUM_CACHE = 'kidsgames-premium-v1.3.5';

// Core files that should be cached immediately
const STATIC_ASSETS = [
  '/KidsGames/',
  '/KidsGames/index.html',
  '/KidsGames/quizzes.html',
  '/KidsGames/manifest.json',
  '/KidsGames/sw.js',
  '/KidsGames/sw.js',
  '/KidsGames/A_Brief_Illustrated_Guide_To_Understanding_Islam.png',
  '/KidsGames/appicon.png',
  '/KidsGames/favicon.ico',
  '/KidsGames/121.png',
  '/KidsGames/2048.jpeg',
  '/KidsGames/30s-chellenge.jpeg',
  '/KidsGames/601.png',
  '/KidsGames/603.png',
  '/KidsGames/606.png',
  '/KidsGames/701.png',
  '/KidsGames/704.png',
  '/KidsGames/705.png',
  '/KidsGames/707.png',
  '/KidsGames/708.png',
  '/KidsGames/709.png',
  '/KidsGames/711.png',
  '/KidsGames/712.png',
  '/KidsGames/713.png',
  '/KidsGames/714.png',
  '/KidsGames/716.png',
  '/KidsGames/718.png',
  '/KidsGames/720.png',
  '/KidsGames/721.png',
  '/KidsGames/722.png',
  '/KidsGames/723.png',
  '/KidsGames/804_text_1.png',
  '/KidsGames/807_text.png',
  '/KidsGames/808_text.png',
  '/KidsGames/809_text.png',
  '/KidsGames/810_text.png',
  '/KidsGames/Allah_made_everything.png',
  '/KidsGames/Allah_made_me_special.png',
  '/KidsGames/Bedtime_with_a_guard_from_Allah.png',
  '/KidsGames/Bee-Not-So-Busy-FKB-Kids-Stories.png',
  '/KidsGames/Dhul_Hijjah_and_Hajj_2024_Z.png',
  '/KidsGames/I_love_Allah_eBook_Premium_Final.png',
  '/KidsGames/Islamic_Learning_october.png',
  '/KidsGames/Life-of-Muhammad-PUBH-in-story.png',
  '/KidsGames/Muharram_and_Ashura.png',
  '/KidsGames/Ramadan_Planner.png',
  '/KidsGames/SholoApril.png',
  '/KidsGames/SholoJanuary.png',
  '/KidsGames/Sholo_4_-_June-August_2023.png',
  '/KidsGames/Sholo_December.png',
  '/KidsGames/Sholo_March_1.png',
  '/KidsGames/Sholo_September.png',
  '/KidsGames/That-Worked.png',
  '/KidsGames/The-story-of-Adam-for-children.png',
  '/KidsGames/The_Power_of_Bismillah_new.png',
  '/KidsGames/Urdu_kid_Story_09.png',
  '/KidsGames/a_day_in_the_life_of_a_muslim_child.png',
  '/KidsGames/aa34aa2_aaa_aaaa34_a_aaa34aa_aa34a_aa2aa_a_aaaaa_aaa34a__a_a_a34a2aa34a__aa2_aaaa34.png',
  '/KidsGames/allah_is_the_creator.png',
  '/KidsGames/amazing-science-adventures.png',
  '/KidsGames/animal-memory-match.png',
  '/KidsGames/aqeedah_course_for_children.png',
  '/KidsGames/arithmetic-speed-drill.jpeg',
  '/KidsGames/baby-s-first-science-book.png',
  '/KidsGames/balloon-pop-adventure.jpeg',
  '/KidsGames/checkers.jpeg',
  '/KidsGames/chess.jpeg',
  '/KidsGames/connect-4.png',
  '/KidsGames/dua_for_kids_-_Aussie_Muslim_Kids_wwwaussiemuslimkidsweeblycom.png',
  '/KidsGames/eating_etiquettes.png',
  '/KidsGames/flappy-bird.png',
  '/KidsGames/hextris.jpeg',
  '/KidsGames/mosaic-breaker.jpg',
  '/KidsGames/ramadan-maze.png',
  '/KidsGames/games/ramadan-maze/index.html',
  '/KidsGames/ramadan-quest.png',
  '/KidsGames/games/ramadan-quest/index.html',
  '/KidsGames/icons/shortcut-ramadan-quest.png',
];

// Game directories to cache on-demand
const GAME_PATHS = [
  '/KidsGames/games/',
  '/KidsGames/read/'
];

// Premium games secret pattern
const PREMIUM_SECRET_PATTERN = /secret=kahf-kids-games-premium-games-AXjKIWUY/i;

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v1.3.5');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        // One file at a time: a single missing file must not fail the whole install
        // (cache.addAll rejects on any 404, which left the PWA with no service worker at all).
        return cacheEach(cache, STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v1.3.5');

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

// A copy of the request that skips the browser's HTTP cache, for storing in our caches.
function freshRequest(request) {
  if (request.mode === 'navigate') {
    return new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' });
  }
  return new Request(request, { cache: 'no-cache' });
}
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
    // All static assets are pre-cached, use Cache First for reliable offline access
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isGameAsset(url.pathname)) {
    // Game assets not in STATIC_ASSETS: Cache First for offline reliability
    event.respondWith(cacheFirst(request, GAMES_CACHE));
  } else if (isPremiumGameAsset(url.pathname)) {
    // Premium game assets: Network First (with fallback to cache) for security
    event.respondWith(networkFirst(request, PREMIUM_CACHE));
  } else {
    // Other assets: Try network first, fallback to cache
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

// Determine if request is for game assets (not already in STATIC_ASSETS)
function isGameAsset(pathname) {
  // Skip if already in STATIC_ASSETS
  if (STATIC_ASSETS.some(asset => pathname === asset)) {
    return false;
  }

  return GAME_PATHS.some(gamePath => pathname.startsWith(gamePath)) ||
    (pathname.startsWith('/KidsGames/') && pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i));
}

// Determine if request is for premium game assets
function isPremiumGameAsset(pathname) {
  return pathname.includes('/KidsGames/premium-games/') ||
    pathname.match(/KidsGames.*premium-games/i);
}

// Determine appropriate cache for game assets
function getGameCache(url) {
  if (url.pathname.includes('/KidsGames/premium-games/')) {
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
    const response = await fetch(freshRequest(request));
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
            background: #F7F5FF;
            color: #10213D;
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
            background: #FFFFFF;
            padding: 40px;
            border-radius: 20px;
            border: 2px solid #6B52D9;
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
            background: #6B52D9;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
          }
          .retry-btn:hover {
            background: #5C47C6;
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
      icon: '/KidsGames/icons/icon-192x192.png',
      badge: '/KidsGames/icons/badge-72x72.png',
      tag: 'kidsgames-update',
      data: {
        url: data.url || '/KidsGames/'
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
        .then(cache => cacheEach(cache, event.data.urls))
    );
  }
});

// Cache each URL on its own; failures are logged and skipped instead of aborting the batch.
async function cacheEach(cache, urls) {
  const results = await Promise.allSettled(urls.map(url =>
    fetch(new Request(url, { cache: 'no-cache' })).then(res => {
      if (!res.ok) throw new Error(res.status + ' ' + url);
      return cache.put(url, res);
    })
  ));
  const failed = urls.filter((url, i) => results[i].status === 'rejected');
  if (failed.length) console.warn('[SW] Could not cache', failed.length, 'files:', failed);
}

console.log('[SW] KidsGames Service Worker v1.3.5 loaded');
