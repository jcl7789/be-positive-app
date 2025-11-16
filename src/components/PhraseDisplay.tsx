'use client';
// Obligatorio para usar Hooks y tener interactividad en Next.js App Router

import React, { useState, useEffect, useCallback } from 'react';
import { PhraseResponse } from '@/lib/types';

// Definición de la URL de nuestra API de consumo
const API_URL = '/api/phrases';

export const PhraseDisplay: React.FC = () => {
  const [phrase, setPhrase] = useState<PhraseResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Usamos useCallback para que la función sea memorizada (aunque el React Compiler lo haría, es buena práctica)
  const fetchNewPhrase = useCallback(async (retryCount = 0) => {
    // No hacer más de 3 intentos
    if (retryCount > 3) {
      setError('Error al obtener la frase después de varios intentos. Por favor, recarga la página.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setAttemptCount(retryCount + 1);

    try {
      const response = await fetch(API_URL, {
        // Agregar timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      });
      
      const data = await response.json();

      if (data.success && data.phrase) {
        setPhrase(data.phrase);
        setAttemptCount(0); // Reset on success
      } else {
        // Manejo de errores si la BD está vacía, etc.
        const errorMessage = data.message || 'Error al obtener la frase.';
        
        // Si es error de no disponible (404), no reintentar
        if (response.status === 404) {
          setError(errorMessage);
        } else {
          // Si es error de servidor (500), reintentar con backoff
          if (response.status === 500 && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial: 1s, 2s, 4s
            setTimeout(() => fetchNewPhrase(retryCount + 1), delay);
            return;
          }
          setError(errorMessage);
        }
      }
    } catch (err) {
      // Manejar diferentes tipos de errores
      let errorMessage = 'No se pudo conectar al servidor.';
      
      if (err instanceof TypeError) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Tiempo de espera agotado. Intenta de nuevo.';
        } else {
          errorMessage = 'Error de conexión. Verifica tu internet.';
        }
      }

      // Reintentar en caso de errores de red
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchNewPhrase(retryCount + 1), delay);
        return;
      }

      setError(errorMessage);
      console.error('Error fetching phrase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar la primera frase al montar el componente
  useEffect(() => {
    fetchNewPhrase();
  }, [fetchNewPhrase]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-amber-50">
      <h1 className="text-2xl font-extrabold text-teal-700 mb-10 tracking-tight">✨ Tu Dosis Diaria de Ánimo ✨</h1>

      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-xl w-full transform transition-all duration-300 hover:scale-[1.01]">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            <p className="text-lg text-gray-500 italic">
              {attemptCount > 0 ? `Reintentando... (${attemptCount})` : 'Cargando inspiración...'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-4">
            <p className="text-red-600 font-medium text-lg">{error}</p>
            <button
              onClick={() => fetchNewPhrase()}
              disabled={loading}
              className="px-6 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Reintentando...' : 'Intentar de Nuevo'}
            </button>
          </div>
        )}

        {phrase && !loading && (
          <div className="flex flex-col gap-6">
            <blockquote className="text-3xl font-medium text-gray-800 leading-relaxed">
              &ldquo;{phrase.message}&rdquo;
            </blockquote>
            
            <div className="flex flex-col gap-3">
              <p className="text-sm text-teal-600 font-semibold uppercase tracking-wide">
                Categoría: {phrase.category}
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fetchNewPhrase()}
                  disabled={loading}
                  className="px-6 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors font-medium"
                >
                  Nueva Frase
                </button>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(phrase.message);
                    alert('¡Frase copiada!');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  title="Copiar frase"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};