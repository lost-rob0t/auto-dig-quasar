export const CACHE_NAME = "quasar-runtime-v2";
export const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest"];

export async function networkFirstNavigation(request, {
  cacheStorage = caches,
  fetchRequest = fetch,
  fallback = "./index.html"
} = {}) {
  const cache = await cacheStorage.open(CACHE_NAME);
  try {
    const response = await fetchRequest(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await cache.put(fallback, response.clone());
      return response;
    }
    return await cache.match(fallback) || response;
  } catch {
    return cache.match(request).then((cached) => cached || cache.match(fallback));
  }
}

export async function cacheFirstAsset(request, {
  cacheStorage = caches,
  fetchRequest = fetch
} = {}) {
  const cached = await cacheStorage.match(request);
  if (cached) return cached;
  const response = await fetchRequest(request);
  if (response.ok) {
    const cache = await cacheStorage.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
