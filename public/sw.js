/* global caches, clients, fetch, Response, URL, self */

const CACHE_PREFIX = 'nivo-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const assetUrls = [
  './',
  './index.html',
  './manifest.webmanifest',
  './nivo-symbol.svg',
  './nivo-icon-180.png',
  './nivo-icon-192.png',
  './nivo-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assetUrls)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => clients.claim()),
  );
});

const cacheResponse = (request, response) => {
  if (!response || !response.ok) return response;
  return caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, response.clone());
    return response;
  });
};

const networkFirst = async (request) => {
  try {
    return await cacheResponse(request, await fetch(request));
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const shellUrl = new URL('./index.html', self.registration.scope).toString();
    return (await caches.match(shellUrl)) || new Response('Nivo est momentanément indisponible.', { status: 503 });
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    return await cacheResponse(request, await fetch(request));
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});
