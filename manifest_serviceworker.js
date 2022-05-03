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
    const req = event.request;
    const url = new URL(req.url);
    event.respondWith(cache(req));
});

async function cache(req){
    const cachedResponse = caches.match(req);
    return cachedResponse || fetch(req);
}
