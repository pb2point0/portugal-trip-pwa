const SHELL_CACHE='honeymoon-portugal-shell-v6';
const MAP_CACHE='honeymoon-portugal-viewed-maps-v1';
const CORE=['/','/manifest.webmanifest','/favicon.svg','/apple-touch-icon.png','/icon-192.png','/icon-512.png'];
self.addEventListener('install',(event)=>event.waitUntil(caches.open(SHELL_CACHE).then((cache)=>cache.addAll(CORE))));
self.addEventListener('activate',(event)=>event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>![SHELL_CACHE,MAP_CACHE].includes(key)).map((key)=>caches.delete(key))))));
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const isMapTile=/\.tile\.openstreetmap\.org$/.test(url.hostname);
  const isRoadRoute=url.hostname==='router.project-osrm.org';
  if(isMapTile||isRoadRoute){
    event.respondWith(caches.open(MAP_CACHE).then(async(cache)=>{
      const cached=await cache.match(event.request);
      if(cached) return cached;
      try {
        const response=await fetch(event.request);
        if(response.ok||response.type==='opaque') void cache.put(event.request,response.clone());
        return response;
      } catch {
        return cached||Response.error();
      }
    }));
    return;
  }
  if(url.origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).then((response)=>{const copy=response.clone();void caches.open(SHELL_CACHE).then((cache)=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then((cached)=>cached||caches.match('/'))));
});
