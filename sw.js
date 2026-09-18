/* Cache the public app shell only. Never intercept OAuth or Gmail requests. */
const CACHE_NAME = 'gmail-pro-shell-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './config.js',
    './core.js',
    './app.js',
    './manifest.json',
    './favicon.png',
    './icons/Icon-192.png',
    './icons/Icon-512.png',
    './vendor/bootstrap.min.css',
    './vendor/bootstrap-icons/bootstrap-icons.min.css',
    './vendor/bootstrap-icons/fonts/bootstrap-icons.woff2',
    './vendor/bootstrap-icons/fonts/bootstrap-icons.woff'
];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('gmail-pro-') && key !== CACHE_NAME).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !assetURLs.has(event.request.url)) return;
    event.respondWith(fetch(event.request).then(response => {
        if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
    }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
