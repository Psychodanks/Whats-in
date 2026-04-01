const DEV_MODE = true;
const CACHE = 'whats-in-v6-20260324';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.svg',
    './Portrait kitchen 3.png',
];

self.addEventListener('install', e => {
    if (!DEV_MODE) {
        e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    }
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    if (DEV_MODE) {
        e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
    } else {
        e.waitUntil(
            caches.keys().then(keys =>
                Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
            )
        );
    }
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    if (DEV_MODE) {
        e.respondWith(fetch(e.request, { cache: 'no-store' }));
        return;
    }

    const url = new URL(e.request.url);
    const isSameOrigin = url.origin === self.location.origin;

    e.respondWith((async () => {
        try {
            const response = await fetch(e.request);

            if (isSameOrigin && response.ok) {
                const cache = await caches.open(CACHE);
                cache.put(e.request, response.clone());
            }

            return response;
        } catch {
            const cached = await caches.match(e.request);
            if (cached) return cached;
            throw new Error('Request failed and no cached response was available.');
        }
    })());
});
