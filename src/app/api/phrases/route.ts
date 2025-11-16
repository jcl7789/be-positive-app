import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db'; // Módulo de conexión a Supabase
import { PhraseResponse } from '@/lib/types';
import { getCachedPhrase, setCachedPhrase } from '@/lib/cache';
import { logInfo, logError, logWarn } from '@/lib/logger';

/**
 * Handles GET requests to retrieve and rotate a single positive phrase.
 * This is the BFF endpoint consumed by the FraseDisplay component.
 */
export async function GET() {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        logInfo('Solicitando frase', { requestId });

        // 1. VERIFICAR CACHÉ
        const cachedPhrase = getCachedPhrase();
        if (cachedPhrase) {
            const duration = Date.now() - startTime;
            logInfo('Frase obtenida del caché', {
                requestId,
                durationMs: duration,
                cached: true,
            });
            return NextResponse.json({
                success: true,
                phrase: cachedPhrase,
                cached: true
            }, { status: 200 });
        }

        // 2. SELECCIÓN DE LA FRASE CON ROTACIÓN
        logInfo('Buscando frase en base de datos', { requestId });
        
        const { data: frases, error: selectError } = await supabase
            .from('frases')
            .select('id, texto, categoria')
            .order('fecha_ultimo_uso', { ascending: true, nullsFirst: true })
            .limit(1);
        
        if (selectError) {
            logError('Error al seleccionar frase de BD', {
                requestId,
                error: selectError.message,
                code: selectError.code,
            });
            return NextResponse.json({
                success: false,
                message: 'Oops! Hubo un error al obtener la frase.'
            }, { status: 500 });
        }

        // 3. VERIFICACIÓN DE RESULTADO
        if (!frases || frases.length === 0) {
            logWarn('No hay frases disponibles en BD', { requestId });
            return NextResponse.json({
                success: false,
                message: 'No hay frases disponibles... Por favor, intenta más tarde.'
            }, { status: 404 });
        }

        const selectedFrase = frases[0];
        const { id, texto, categoria } = selectedFrase;

        logInfo('Frase seleccionada de BD', {
            requestId,
            phraseId: id,
            category: categoria,
        });

        // 4. ACTUALIZACIÓN DEL REGISTRO DE USO (ROTACIÓN)
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('frases')
            .update({ fecha_ultimo_uso: now })
            .eq('id', id);
        
        if (updateError) {
            logError('Error actualizando timestamp de uso', {
                requestId,
                phraseId: id,
                error: updateError.message,
            });
            // No fallar por esto, ya que la frase fue seleccionada
        }

        const response: PhraseResponse = {
            message: texto,
            category: categoria,
        };

        // 5. GUARDAR EN CACHÉ
        setCachedPhrase(response);

        // 6. RESPUESTA EXITOSA
        const duration = Date.now() - startTime;
        logInfo('Frase retornada exitosamente', {
            requestId,
            durationMs: duration,
            cached: false,
        });

        return NextResponse.json({
            success: true,
            phrase: response,
            cached: false
        }, { status: 200 });

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        logError('Error no esperado al obtener frase', {
            requestId,
            durationMs: duration,
            error: errorMsg,
            stack: error instanceof Error ? error.stack : undefined,
        });
        
        return NextResponse.json({
            success: false,
            message: 'Oops! Hubo un error al obtener la frase.'
        }, { status: 500 });
    }
}