// Bei JEDEM Deploy erhöhen, sonst bekommen installierte Apps das Update nicht.
var VERSION = "1";
var CACHE = "lohnzeit-v" + VERSION;

// Relativ zu sw.js, funktioniert also auch in einem Unterordner (GitHub Pages).
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  // cache:"reload" umgeht den HTTP-Cache, damit wirklich die neue Version gespeichert wird.
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(ASSETS.map(function(u){ return new Request(u, {cache:"reload"}); }));
    })
  );
  // Kein skipWaiting hier: die neue Version wartet, bis der Nutzer "neu laden" tippt.
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k.indexOf("lohnzeit-") === 0 && k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("message", function(e){
  if(e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  // HTML-Seite: network-first, damit Updates ankommen; offline aus dem Cache.
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        if(res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        }
        return res;
      }).catch(function(){
        return caches.match("./index.html", {cacheName:CACHE}).then(function(r){
          return r || caches.match("./");
        });
      })
    );
    return;
  }

  // Alles andere: cache-first.
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(r){
      return r || fetch(req).then(function(res){
        if(res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
