/* ميزان — Service Worker */
const VERSION = 'mizan-v1.8.3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png'];
const EXTRA = [
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Readex+Pro:wght@500;600;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(EXTRA.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r))));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.github.com') return; // البيانات دائماً من الشبكة، والتطبيق يحتفظ بنسخته المحلية
  if (req.mode === 'navigate') {
    // يفتح فوراً من النسخة المحفوظة، ويحدّثها في الخلفية — حتى لا يتعلق التطبيق مع شبكة ضعيفة
    const net = fetch(req, { cache: 'no-store' }).then(async r => {
      if (r && r.ok && r.type === 'basic') { const c = await caches.open(VERSION); await c.put('./index.html', r.clone()); }
      return r;
    }).catch(() => null);
    e.respondWith((async () => {
      const cached = (await caches.match('./index.html')) || (await caches.match('./'));
      if (cached) { e.waitUntil(net); return cached; }
      const timeout = new Promise(res => setTimeout(() => res(null), 8000));
      return (await Promise.race([net, timeout])) || new Response('<meta charset="utf-8"><body style="font-family:Tahoma;text-align:center;padding:40px" dir="rtl"><h2>تعذر الاتصال</h2><p>تحقق من الإنترنت ثم أعد المحاولة</p><button onclick="location.reload()">إعادة المحاولة</button>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const net = fetch(req).then(async r => {
      if (r && (r.ok || r.type === 'opaque')) { const c = await caches.open(VERSION); c.put(req, r.clone()); }
      return r;
    }).catch(() => null);
    return cached || (await net) || new Response('', { status: 504 });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) { all[0].focus(); all[0].postMessage({ type: 'open-notifs' }); }
    else self.clients.openWindow('./index.html');
  })());
});
