/* ============================================================
   MIJNLIJN — service worker
   Na één keer laden werkt de hele app offline.
   ============================================================ */

const CACHE = "mijnlijn-v1";

const BESTANDEN = [
  "./",
  "index.html",
  "maak.html",
  "css/stijl.css",
  "css/thuis.css",
  "css/maak.css",
  "js/kaart.js",
  "js/maak.js",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BESTANDEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Netwerk eerst, cache als vangnet */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((antwoord) => {
        const kopie = antwoord.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopie));
        return antwoord;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
