/*
 * Service worker: ทำให้แอปเปิดได้แม้ไม่มีอินเทอร์เน็ต
 * กลยุทธ์ "เน็ตก่อน แคชสำรอง": เมื่อออนไลน์จะได้ไฟล์ล่าสุดเสมอ (แก้โค้ดแล้วไม่ต้องจำเลขเวอร์ชัน)
 * เมื่อออฟไลน์หรือเน็ตช้าเกิน 3 วินาที จึงใช้ไฟล์ที่แคชไว้
 */
const CACHE = 'habit-tracker-v1';
const PRECACHE = [
  './',
  'index.html',
  'css/styles.css',
  'js/logic.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // ไฟล์ไหนโหลดไม่ได้ก็ข้าม ไม่ให้การติดตั้งทั้งหมดล้ม
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(event, req));
});

async function networkFirst(event, req) {
  const cache = await caches.open(CACHE);
  const cached = (await cache.match(req, { ignoreSearch: true }))
    || (req.mode === 'navigate' ? await cache.match('./') : undefined);
  try {
    // ถ้ายังไม่มีแคช รอเน็ตได้ไม่จำกัดเวลา ถ้ามีแล้วรอแค่ 3 วินาที
    const res = await fetchWithTimeout(req, cached ? 3000 : 0);
    if (res.ok) event.waitUntil(cache.put(req, res.clone()).catch(() => {}));
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const timer = ms ? setTimeout(() => ctrl.abort(), ms) : null;
  return fetch(req, { signal: ctrl.signal, cache: 'no-cache' }).finally(() => clearTimeout(timer));
}
