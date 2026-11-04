// Network first, cache as a fallback: students always get the newest files when online,
// and the labs still open offline after one visit. Covers the Construct Lab and break-it/.
// Bump CACHE_VERSION when files change.
const CACHE_VERSION = "construct-lab-v1.5.1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "engine.js", "data.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-512-maskable.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok && sameOrigin) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
