/**
 * In-memory cache system with 24-hour expiration
 * Caches the daily phrase to avoid unnecessary database queries
 * 
 * NOTA: Este caché es por proceso. En deployments con múltiples instancias,
 * se recomienda usar Redis o Vercel KV para caché compartido.
 */

import { PhraseResponse } from './types';
import { logInfo, logDebug } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PhraseCache {
  dailyPhrase: CacheEntry<PhraseResponse> | null;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

const cache: PhraseCache = {
  dailyPhrase: null,
};

/**
 * Obtiene la frase cacheada si existe y no ha expirado
 */
export function getCachedPhrase(): PhraseResponse | null {
  if (!cache.dailyPhrase) {
    logDebug('Caché vacío');
    return null;
  }

  const now = Date.now();
  const age = now - cache.dailyPhrase.timestamp;
  const ageInMinutes = Math.floor(age / (60 * 1000));

  // Si ha expirado, limpiar y retornar null
  if (age > CACHE_DURATION) {
    logInfo('Frase en caché expirada, limpiando', { ageInMinutes });
    cache.dailyPhrase = null;
    return null;
  }

  logDebug('Retornando frase del caché', { ageInMinutes });
  return cache.dailyPhrase.data;
}

/**
 * Guarda una frase en caché con timestamp actual
 */
export function setCachedPhrase(data: PhraseResponse): void {
  const expiresAt = Date.now() + CACHE_DURATION;
  cache.dailyPhrase = {
    data,
    timestamp: Date.now(),
  };
  logInfo('Frase cacheada correctamente', {
    expiresAtISO: new Date(expiresAt).toISOString(),
    durationHours: 24,
  });
}

/**
 * Limpia todo el caché (útil para testing o reinicio manual)
 */
export function clearCache(): void {
  cache.dailyPhrase = null;
  logInfo('Caché limpiado');
}

/**
 * Obtiene información del caché (útil para debugging)
 */
export function getCacheInfo(): { cached: boolean; ageInMinutes?: number } {
  if (!cache.dailyPhrase) {
    return { cached: false };
  }

  const ageInMinutes = Math.floor((Date.now() - cache.dailyPhrase.timestamp) / (60 * 1000));
  return { cached: true, ageInMinutes };
}
