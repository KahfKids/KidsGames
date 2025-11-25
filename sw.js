const CACHE_NAME = 'kidsgames-v1.2.0';
const STATIC_CACHE = 'kidsgames-static-v1.2.0';
const GAMES_CACHE = 'kidsgames-games-v1.2.0';
const PREMIUM_CACHE = 'kidsgames-premium-v1.2.0';

// Core files that should be cached immediately
const STATIC_ASSETS = [
  '/KidsGames/',
  '/KidsGames/index.html',
  '/KidsGames/manifest.json',
  '/KidsGames/sw.js',
  '/KidsGames/2048/style/fonts/clear-sans.css',
  '/KidsGames/2048/style/main.css',
  '/KidsGames/arithmetic-speed-drill/style.css',
  '/KidsGames/chess/style.css',
  '/KidsGames/css/flipbook.style.css',
  '/KidsGames/css/font-awesome.css',
  '/KidsGames/css/footer.css',
  '/KidsGames/hextris/style/fa/css/font-awesome.css',
  '/KidsGames/hextris/style/fa/css/font-awesome.min.css',
  '/KidsGames/hextris/style/rrssb.css',
  '/KidsGames/hextris/style/style.css',
  '/KidsGames/tic-tac-toe/style.css',
  '/KidsGames/tower-blocks/style.css',
  '/KidsGames/2048/js/animframe_polyfill.js',
  '/KidsGames/2048/js/application.js',
  '/KidsGames/2048/js/bind_polyfill.js',
  '/KidsGames/2048/js/classlist_polyfill.js',
  '/KidsGames/2048/js/game_manager.js',
  '/KidsGames/2048/js/grid.js',
  '/KidsGames/2048/js/html_actuator.js',
  '/KidsGames/2048/js/keyboard_input_manager.js',
  '/KidsGames/2048/js/local_storage_manager.js',
  '/KidsGames/2048/js/tile.js',
  '/KidsGames/arithmetic-speed-drill/script.js',
  '/KidsGames/chess/script.js',
  '/KidsGames/generate-icons.js',
  '/KidsGames/hextris/a.js',
  '/KidsGames/hextris/js/Block.js',
  '/KidsGames/hextris/js/Hex.js',
  '/KidsGames/hextris/js/Text.js',
  '/KidsGames/hextris/js/checking.js',
  '/KidsGames/hextris/js/comboTimer.js',
  '/KidsGames/hextris/js/initialization.js',
  '/KidsGames/hextris/js/input.js',
  '/KidsGames/hextris/js/main.js',
  '/KidsGames/hextris/js/math.js',
  '/KidsGames/hextris/js/render.js',
  '/KidsGames/hextris/js/save-state.js',
  '/KidsGames/hextris/js/update.js',
  '/KidsGames/hextris/js/view.js',
  '/KidsGames/hextris/js/wavegen.js',
  '/KidsGames/hextris/vendor/hammer.min.js',
  '/KidsGames/hextris/vendor/jquery.js',
  '/KidsGames/hextris/vendor/js.cookie.js',
  '/KidsGames/hextris/vendor/jsonfn.min.js',
  '/KidsGames/hextris/vendor/keypress.min.js',
  '/KidsGames/hextris/vendor/rrssb.min.js',
  '/KidsGames/hextris/vendor/sweet-alert.min.js',
  '/KidsGames/js/flipbook-init.js',
  '/KidsGames/js/flipbook.book3.min.js',
  '/KidsGames/js/flipbook.min.js',
  '/KidsGames/js/flipbook.pdfservice.min.js',
  '/KidsGames/js/flipbook.swipe.min.js',
  '/KidsGames/js/flipbook.webgl.js',
  '/KidsGames/js/flipbook.webgl.min.js',
  '/KidsGames/js/iscroll.min.js',
  '/KidsGames/js/pdf.min.js',
  '/KidsGames/js/pdf.worker.min.js',
  '/KidsGames/js/three.min.js',
  '/KidsGames/sw.js',
  '/KidsGames/tic-tac-toe/script.js',
  '/KidsGames/tower-blocks/script.js',
  '/KidsGames/2048/style/fonts/ClearSans-Bold-webfont.eot',
  '/KidsGames/2048/style/fonts/ClearSans-Bold-webfont.woff',
  '/KidsGames/2048/style/fonts/ClearSans-Light-webfont.eot',
  '/KidsGames/2048/style/fonts/ClearSans-Light-webfont.woff',
  '/KidsGames/2048/style/fonts/ClearSans-Regular-webfont.eot',
  '/KidsGames/2048/style/fonts/ClearSans-Regular-webfont.woff',
  '/KidsGames/hextris/style/fa/fonts/FontAwesome.otf',
  '/KidsGames/hextris/style/fa/fonts/fontawesome-webfont.eot',
  '/KidsGames/hextris/style/fa/fonts/fontawesome-webfont.ttf',
  '/KidsGames/hextris/style/fa/fonts/fontawesome-webfont.woff',
  '/KidsGames/hextris/style/fonts/Exo2-ExtraLight.otf',
  '/KidsGames/hextris/style/fonts/Exo2-Regular.otf',
  '/KidsGames/hextris/style/fonts/Exo2-SemiBold.otf',
  '/KidsGames/hextris/style/fonts/Lovelo.otf',
  '/KidsGames/hextris/style/fonts/QuattrocentoSans-Regular.ttf',
  '/KidsGames/hextris/style/fonts/roboto.woff',
  '/KidsGames/webfonts/fa-brands-400.eot',
  '/KidsGames/webfonts/fa-brands-400.ttf',
  '/KidsGames/webfonts/fa-brands-400.woff',
  '/KidsGames/webfonts/fa-brands-400.woff2',
  '/KidsGames/webfonts/fa-regular-400.eot',
  '/KidsGames/webfonts/fa-regular-400.ttf',
  '/KidsGames/webfonts/fa-regular-400.woff',
  '/KidsGames/webfonts/fa-regular-400.woff2',
  '/KidsGames/webfonts/fa-solid-900.eot',
  '/KidsGames/webfonts/fa-solid-900.ttf',
  '/KidsGames/webfonts/fa-solid-900.woff',
  '/KidsGames/webfonts/fa-solid-900.woff2',
  '/KidsGames/2048/favicon.ico',
  '/KidsGames/2048/meta/apple-touch-icon.png',
  '/KidsGames/A_Brief_Illustrated_Guide_To_Understanding_Islam.png',
  '/KidsGames/appicon.png',
  '/KidsGames/favicon.ico',
  '/KidsGames/hextris/favicon.ico',
  '/KidsGames/hextris/images/icon_arrows.svg',
  '/KidsGames/hextris/images/icons/apple-touch-120.png',
  '/KidsGames/hextris/images/icons/apple-touch-152.png',
  '/KidsGames/hextris/images/icons/apple-touch-167.png',
  '/KidsGames/hextris/images/icons/apple-touch-180.png',
  '/KidsGames/hextris/images/icons/apple-touch-512.png',
  '/KidsGames/hextris/images/icons/apple-touch.svg',
  '/KidsGames/hextris/images/icons/maskable-192.png',
  '/KidsGames/hextris/images/icons/maskable-192.webp',
  '/KidsGames/hextris/images/icons/maskable-512.png',
  '/KidsGames/hextris/images/icons/maskable-512.webp',
  '/KidsGames/hextris/images/icons/maskable.svg',
  '/KidsGames/hextris/images/icons/transparent-192.png',
  '/KidsGames/hextris/images/icons/transparent-192.webp',
  '/KidsGames/hextris/images/icons/transparent-512.png',
  '/KidsGames/hextris/images/icons/transparent-512.webp',
  '/KidsGames/hextris/images/icons/transparent.svg',
  '/KidsGames/icon-1024x1024.png',
  '/KidsGames/icon-128x128.png',
  '/KidsGames/icon-144x144.png',
  '/KidsGames/icon-150x150.png',
  '/KidsGames/icon-152x152.png',
  '/KidsGames/icon-167x167.png',
  '/KidsGames/icon-16x16.png',
  '/KidsGames/icon-180x180.png',
  '/KidsGames/icon-192x192.png',
  '/KidsGames/icon-194x194.png',
  '/KidsGames/icon-195x195.png',
  '/KidsGames/icon-196x196.png',
  '/KidsGames/icon-210x210.png',
  '/KidsGames/icon-256x256.png',
  '/KidsGames/icon-310x310.png',
  '/KidsGames/icon-320x320.png',
  '/KidsGames/icon-32x32.png',
  '/KidsGames/icon-384x384.png',
  '/KidsGames/icon-400x400.png',
  '/KidsGames/icon-512x512.png',
  '/KidsGames/icon-70x70.png',
  '/KidsGames/icon-72x72.png',
  '/KidsGames/icon-96x96.png',
  '/KidsGames/images/KPK_Logo.svg',
  '/KidsGames/images/logo.png',
  '/KidsGames/kidsgames-icon.svg',
  '/KidsGames/maskable-icon-192x192.png',
  '/KidsGames/maskable-icon-512x512.png',
  '/KidsGames/monochrome-icon-192x192.png',
  '/KidsGames/monochrome-icon-512x512.png',
  '/KidsGames/simple-icon.svg',
  '/KidsGames/121.png',
  '/KidsGames/2048.jpeg',
  '/KidsGames/2048/meta/apple-touch-startup-image-640x1096.png',
  '/KidsGames/2048/meta/apple-touch-startup-image-640x920.png',
  '/KidsGames/2048/style/fonts/ClearSans-Bold-webfont.svg',
  '/KidsGames/2048/style/fonts/ClearSans-Light-webfont.svg',
  '/KidsGames/2048/style/fonts/ClearSans-Regular-webfont.svg',
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
  '/KidsGames/hextris/images/android.png',
  '/KidsGames/hextris/images/appstore.svg',
  '/KidsGames/hextris/images/btn_back.svg',
  '/KidsGames/hextris/images/btn_facebook.svg',
  '/KidsGames/hextris/images/btn_help.svg',
  '/KidsGames/hextris/images/btn_pause.svg',
  '/KidsGames/hextris/images/btn_restart.svg',
  '/KidsGames/hextris/images/btn_resume.svg',
  '/KidsGames/hextris/images/btn_share.svg',
  '/KidsGames/hextris/images/btn_twitter.svg',
  '/KidsGames/hextris/images/facebook-opengraph.png',
  '/KidsGames/hextris/images/twitter-opengraph.png',
  '/KidsGames/hextris/style/fa/fonts/fontawesome-webfont.svg',
  '/KidsGames/images/Transparent.png',
  '/KidsGames/images/book2/1.jpg',
  '/KidsGames/images/book2/10.jpg',
  '/KidsGames/images/book2/11.jpg',
  '/KidsGames/images/book2/12.jpg',
  '/KidsGames/images/book2/2.jpg',
  '/KidsGames/images/book2/3.jpg',
  '/KidsGames/images/book2/4.jpg',
  '/KidsGames/images/book2/5.jpg',
  '/KidsGames/images/book2/6.jpg',
  '/KidsGames/images/book2/7.jpg',
  '/KidsGames/images/book2/8.jpg',
  '/KidsGames/images/book2/9.jpg',
  '/KidsGames/images/overlay.png',
  '/KidsGames/images/overlay_lightbox.png',
  '/KidsGames/images/preloader.jpg',
  '/KidsGames/images/shelf_glass.png',
  '/KidsGames/images/shelf_metal.png',
  '/KidsGames/images/shelf_wood.png',
];

// Game directories to cache on-demand
const GAME_PATHS = [
  '/KidsGames/games/',
  '/KidsGames/premium-games/',
  '/KidsGames/read/'
];

// Premium games secret pattern
const PREMIUM_SECRET_PATTERN = /secret=kahf-kids-games-premium-games-AXjKIWUY/i;

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v1.2.0');

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
  console.log('[SW] Activating service worker v1.2.0');

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
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});

console.log('[SW] KidsGames Service Worker v1.2.0 loaded');