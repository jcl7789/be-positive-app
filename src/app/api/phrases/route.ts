import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db'; // Módulo de conexión a Supabase
import { PhraseResponse } from '@/lib/types';
import { getCachedPhrase, setCachedPhrase } from '@/lib/cache';
import { logInfo, logError, logWarn } from '@/lib/logger';

/**
 * Selecciona una frase de BD sin actualizar última fecha de uso
 * Útil para preview/vista previa sin afectar rotación
 */
async function selectPhraseWithoutUpdate(requestId: string) {
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
        throw new Error(selectError.message);
    }

    if (!frases || frases.length === 0) {
        logWarn('No hay frases disponibles en BD', { requestId });
        throw new Error('No hay frases disponibles');
    }

    return frases[0];
}

/**
 * Selecciona una frase de BD y actualiza última fecha de uso (rotación)
 */
async function selectPhraseWithUpdate(requestId: string) {
    const selectedFrase = await selectPhraseWithoutUpdate(requestId);
    const { id } = selectedFrase;

    // Actualizar timestamp
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

    return selectedFrase;
}

/**
 * GET /api/phrases
 * Obtiene una frase con caché de 24h y rotación de uso
 * Primera llamada del día usa caché, si no hay caché busca en BD
 */
export async function GET() {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        logInfo('GET /api/phrases - Solicitando frase con caché', { requestId });

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

        // 2. SELECCIÓN CON ACTUALIZACIÓN DE ROTACIÓN
        logInfo('Buscando frase en base de datos (sin caché)', { requestId });
        const selectedFrase = await selectPhraseWithUpdate(requestId);
        const { texto, categoria } = selectedFrase;

        const response: PhraseResponse = {
            message: texto,
            category: categoria,
        };

        // 3. GUARDAR EN CACHÉ
        setCachedPhrase(response);

        // 4. RESPUESTA EXITOSA
        const duration = Date.now() - startTime;
        logInfo('Frase retornada exitosamente (GET)', {
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
        
        logError('Error en GET /api/phrases', {
            requestId,
            durationMs: duration,
            error: errorMsg,
        });

        // Determinar código de status
        const statusCode = errorMsg.includes('No hay frases') ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            message: errorMsg || 'Oops! Hubo un error al obtener la frase.'
        }, { status: statusCode });
    }
}

/**
 * POST /api/phrases
 * Obtiene una frase nueva BYPASANDO el caché
 * Útil para botón "Nueva Frase" en UI
 * No actualiza fecha de último uso (previewing sin afectar rotación)
 */
export async function POST() {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        logInfo('POST /api/phrases - Solicitando frase nueva (sin caché)', { requestId });

        // Seleccionar frase sin actualizar rotación
        const selectedFrase = await selectPhraseWithoutUpdate(requestId);
        const { texto, categoria } = selectedFrase;

        const response: PhraseResponse = {
            message: texto,
            category: categoria,
        };

        const duration = Date.now() - startTime;
        logInfo('Frase nueva retornada exitosamente (POST)', {
            requestId,
            durationMs: duration,
        });

        return NextResponse.json({
            success: true,
            phrase: response,
            cached: false,
            note: 'Frase nueva obtenida sin afectar caché o rotación'
        }, { status: 200 });

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        logError('Error en POST /api/phrases', {
            requestId,
            durationMs: duration,
            error: errorMsg,
        });

        const statusCode = errorMsg.includes('No hay frases') ? 404 : 500;
        
        return NextResponse.json({
            success: false,
            message: errorMsg || 'Oops! Hubo un error al obtener la frase.'
        }, { status: statusCode });
    }
}