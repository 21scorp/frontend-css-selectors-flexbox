/* ============================================================
   VLOT — service worker
   Maakt de app volledig offline bruikbaar: alle bestanden
   worden gecachet; bij een nieuwe versie wordt de cache ververst.
   ============================================================ */

const CACHE = "vlot-v1";

const BESTANDEN = [
  "./",
  "index.html",
  "studio.html",
  "css/tokens.css",
  "css/site.css",
  "css/studio.css",
  "css/factuur.css",
  "css/print.css",
  "js/model.js",
  "js/factuur-render.js",
  "js/studio.js",
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
      .then((sleutels) => Promise.all(sleutels.filter((s) => s !== CACHE).map((s) => caches.delete(s))))
      .then(() => self.clients.claim())
  );
});

/* Netwerk eerst, cache als vangnet — zo krijgt de gebruiker updates
   zodra die er zijn, maar blijft alles werken zonder verbinding. */
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
