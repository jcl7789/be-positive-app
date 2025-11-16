/**
 * In-memory cache system with 24-hour expiration
 * Caches the daily phrase to avoid unnecessary database queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PhraseCache {
  dailyPhrase: CacheEntry<any> | null;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

let cache: PhraseCache = {
  dailyPhrase: null,
};

/**
 * Obtiene la frase cacheada si existe y no ha expirado
 */
export function getCachedPhrase() {
  if (!cache.dailyPhrase) {
    return null;
  }

  const now = Date.now();
  const age = now - cache.dailyPhrase.timestamp;

  // Si ha expirado, limpiar y retornar null
  if (age > CACHE_DURATION) {
    console.info('Cached phrase expired, fetching fresh phrase from database');
    cache.dailyPhrase = null;
    return null;
  }

  console.info('Returning cached phrase');
  return cache.dailyPhrase.data;
}

/**
 * Guarda una frase en caché con timestamp actual
 */
export function setCachedPhrase(data: any) {
  cache.dailyPhrase = {
    data,
    timestamp: Date.now(),
  };
  console.info('Phrase cached successfully', { expiresAt: new Date(cache.dailyPhrase.timestamp + CACHE_DURATION) });
}

/**
 * Limpia todo el caché (útil para testing o reinicio manual)
 */
export function clearCache() {
  cache.dailyPhrase = null;
  console.info('Cache cleared');
}
