const CACHE_NAME = "integral-correctivos-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js?v=24",
  "./seed-data.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./exceljs.min.js",
  "./checklist-template.xlsx",
  "../../informes/vendor/jspdf.umd.min.js",
  "../../informes/vendor/jspdf.plugin.autotable.min.js",
  "../../informes/vendor/pdf-lib.min.js",
  "../../informes/vendor/pdf.min.js",
  "../../informes/vendor/pdf.worker.min.js",
  "../../informes/core.js?v=13",
  "../../informes/pdf-service.js?v=12",
  "../../informes/client-reports.js?v=4",
  "../../informes/data.js?v=3",
  "../../informes/client-portfolio.js?v=2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("integral-correctivos-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
