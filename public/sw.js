const CACHE = "school-hq-shell-v3";
const SHELL = ["/", "/assignments", "/calendar", "/planner", "/focus", "/stats", "/settings", "/login", "/icons/icon-192.png", "/icons/icon-512.png"];
const isAuthRequest = (url) => url.pathname === "/login" || url.pathname.includes("/auth/") || url.pathname.includes("session");
const isStaticAsset = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:css|js|woff2?|png|svg|ico)$/.test(url.pathname);
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("message", (event) => { if (event.data?.type === "CLEAR_USER_CACHES") event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))); });
self.addEventListener("fetch", (event) => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || isAuthRequest(url)) return;
  if (isStaticAsset(url)) { event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => { if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone())); return response; }))); return; }
  if (request.mode === "navigate") event.respondWith(fetch(request).then((response) => { if (response.ok && SHELL.includes(url.pathname)) caches.open(CACHE).then((cache) => cache.put(url.pathname, response.clone())); return response; }).catch(() => caches.match(url.pathname).then((hit) => hit || caches.match("/"))));
});
