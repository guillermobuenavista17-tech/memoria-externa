'use strict';

const prefix = 'memoria-externa:' + self.registration.scope + ':';
const cacheName = prefix + 'v1';
const resolve = path => new URL(path, self.registration.scope).href;
const home = resolve('./index.html');
const files = [
  './index.html', './style.css', './app.js', './manifest.json',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'
].map(resolve);
const pages = new Set([resolve('./'), home]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(files.map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  const navigation = event.request.mode === 'navigate' && pages.has(url.href);
  if (!navigation && !files.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(navigation ? home : url.href) || fetch(event.request);
  })());
});
