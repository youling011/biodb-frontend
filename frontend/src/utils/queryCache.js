const DEFAULT_TTL = 1000 * 60 * 10; // 10 min

const memoryCache = new Map();

function now() {
  return Date.now();
}

function buildKey(key, params, schemaVersion, mode) {
  const base = typeof key === "string" ? key : JSON.stringify(key);
  const p = params ? JSON.stringify(params) : "";
  return `${base}::${schemaVersion || "v1"}::${mode || "demo"}::${p}`;
}

export function getCached(key, params, { schemaVersion = "v1", mode = "demo" } = {}) {
  const cacheKey = buildKey(key, params, schemaVersion, mode);
  const item = memoryCache.get(cacheKey);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt < now()) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return item.value;
}

export function setCached(key, params, value, { ttl = DEFAULT_TTL, schemaVersion = "v1", mode = "demo" } = {}) {
  const cacheKey = buildKey(key, params, schemaVersion, mode);
  memoryCache.set(cacheKey, {
    value,
    expiresAt: ttl ? now() + ttl : null,
  });
}

export function invalidateCache(prefix = "") {
  for (const key of memoryCache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
