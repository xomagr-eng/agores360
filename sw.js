/* ΑΓΟΡΕΣ 360° — Service Worker (offline cache, auto-update) */
const CACHE = "agores360-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  // Εξωτερικά (π.χ. Open Food Facts) περνούν κανονικά στο δίκτυο.
  if (url.origin !== location.origin) return;

  // Η σελίδα/πλοήγηση: NETWORK-FIRST ώστε να βλέπεις πάντα την τελευταία έκδοση όταν έχεις internet.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Υπόλοιπα assets: cache-first με ανανέωση στο παρασκήνιο.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return resp;
    }).catch(() => cached))
  );
});
