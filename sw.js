// Service worker: keeps a copy of the site's files on the phone so the page
// (and the last saved timetable) still opens without a connection.
// Paths are relative to this file, so the site works in any folder.
// Files are served from the copy and refreshed in the background, so a new
// version appears on the next visit after it is published.

const CACHE = 'dormshuttle-v4';
const FILES = [
  './', './index.html', './privacy.html', './404.html', './manifest.webmanifest',
  './src/config.js', './src/strings/en.json', './src/css/style.css',
  './src/js/app.js', './src/js/api.js', './src/js/errors.js', './src/js/i18n.js', './src/js/time.js',
  './src/js/timetable.js', './src/js/page.js', './src/js/demo-backend.js', './src/js/demo-data.js',
  './src/js/supabase-backend.js',
  './src/vendor/leaflet/leaflet.js', './src/vendor/leaflet/leaflet.css',
  './src/fonts/inter-latin-wght-normal.woff2',
  './src/img/bus.svg', './src/img/icon.svg', './src/img/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only this site's own files. Map images and bus data always come fresh from the network.
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // The admin page is never served from the copy.
  if (url.pathname.includes('/admin/')) return;

  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    const fresh = fetch(event.request)
      .then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
      .catch(() => null);
    if (cached) {
      event.waitUntil(fresh);
      return cached;
    }
    const response = await fresh;
    if (response) return response;
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) ?? Response.error();
    return Response.error();
  }));
});
