const CACHE='plane-shell-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/login'])))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return; e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{const clone=res.clone();caches.open(CACHE).then(cache=>cache.put(r,clone));return res}).catch(()=>caches.match('/'))))});
