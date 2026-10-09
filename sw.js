// Fléchette : toujours la dernière version en ligne ; la copie locale ne sert que sans réseau.
const CACHE="flechette-v17";
self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k); // anciennes versions supprimées
  await self.clients.claim();
})())});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    try{const res=await fetch(r,{cache:"no-store"});const c=await caches.open(CACHE);c.put(r,res.clone());return res}
    catch(err){const m=await caches.match(r);if(m)return m;throw err}
  })());
});
