import api from './apiClient';

const makeKey = (path, params) => `${path}::${params ? JSON.stringify(params) : ''}`;

export async function getCached(path, params = {}, ttlSeconds = 30, force = false) {
  const key = `cache:${makeKey(path, params)}`;
  try {
    if (!force) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp) < ttlSeconds * 1000) {
          return { data: parsed.data };
        }
      }
    }
  } catch (_) {
    // Ignore localStorage errors and fall through to network
  }

  const res = await api.get(path, { params });
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: res.data }));
  } catch (_) {}
  return res;
}

export function invalidateCache(path, params = null) {
  try {
    if (params === null) {
      // remove all keys for path
      const prefix = `cache:${path}::`;
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(prefix)) localStorage.removeItem(k);
      }
    } else {
      const key = `cache:${makeKey(path, params)}`;
      localStorage.removeItem(key);
    }
  } catch (_) {}
}

export default { getCached, invalidateCache };
