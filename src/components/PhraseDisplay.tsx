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

  // Usamos useCallback para que la función sea memorizada (aunque el React Compiler lo haría, es buena práctica)
  const fetchNewPhrase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.success) {
        setPhrase(data.phrase);
      } else {
        // Manejo de errores si la BD está vacía, etc.
        setError(data.message || 'Error al obtener la frase.');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor.');
      console.error(err);
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
          <p className="text-xl text-gray-500 italic">Cargando inspiración...</p>
        )}

        {error && (
          <p className="text-red-500 font-medium">{error}</p>
        )}

        {phrase && !loading && (
          <>
            <blockquote className="text-3xl font-medium text-gray-800 leading-relaxed">
              "{phrase.message}"
            </blockquote>
          </>
        )}
      </div>
    </div>
  );
};