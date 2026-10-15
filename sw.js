// Fléchette : toujours la dernière version en ligne ; la copie locale ne sert que sans réseau.
const CACHE="flechette-v34";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","favicon.png","apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil((async()=>{
  try{const c=await caches.open(CACHE);await c.addAll(SHELL)}catch(err){} // hors ligne dès la première visite
  await self.skipWaiting();
})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k); // anciennes versions supprimées
  await self.clients.claim();
})())});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  if(/[?&]banc\b|banc\.js$/.test(r.url))return; // banc d'essai : jamais en cache
  e.respondWith((async()=>{
    try{const res=await fetch(r,{cache:"no-store"});if(res.ok){const c=await caches.open(CACHE);c.put(r,res.clone())}return res}
    catch(err){const m=await caches.match(r,{ignoreSearch:true});if(m)return m;throw err}
  })());
});
