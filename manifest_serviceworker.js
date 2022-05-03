const staticAssets=[
    './',
    './index.html',
    './solid-code.js',
    './uix-init.js',
    './favicon.ico',
    './apple-touch-icon.png',
    './manifest-app-icon.png'
];

self.addEventListener('install', async event=>{
    const cache = await caches.open('static-cache');
    cache.addAll(staticAssets);
});
self.addEventListener('fetch', event => {
  // Prevent the default, and handle the request ourselves.
  event.respondWith(async function() {
    // Try to get the response from a cache.
    const cachedResponse = await caches.match(event.request);
    // Return it if we found one.
    if (cachedResponse) return cachedResponse;
    // If we didn't find a match in the cache, use the network.
    return fetch(event.request);
  }());
});
