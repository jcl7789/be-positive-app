import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai'; // Asume la instalación del SDK de Gemini
import { supabase } from '@/lib/db'; // Módulo de conexión a Supabase
import { PhraseResponse, CronJobResponse, SupabasePhrase } from '@/lib/types';
import { withExponentialBackoff, safeJsonParse, type RetryOptions } from '@/lib/retry';
import { logInfo, logWarn, logError } from '@/lib/logger';

// El prompt maestro definido
const POETA_PROMPT = `Eres un poeta cuyo único objetivo es elevar el espíritu del lector. Debes generar una sola frase que sea profundamente positiva y excepcionalmente concisa, enfocada en un único sentimiento inspirador.

La frase debe combinar uno de los siguientes elementos: hacer un cumplido, recordar algo importante o desear suerte.

Tu respuesta debe ser un objeto JSON que contenga exactamente dos claves:
1.  **category**: (El sentimiento principal de la frase, debe ser uno de: "Amor", "Fe", "Esperanza", "Gratitud", o "Fuerza").
2.  **message**: (La frase generada).

Asegúrate de que la frase sea directa y poética, y que no exceda las 15 palabras.

---

Ejemplo de salida requerida:

{
"category": "Fuerza",
"message": "Tu luz interior puede guiar al universo entero; ¡brilla hoy con esa fuerza!"
}`;

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function GET(request: NextRequest): Promise<NextResponse<CronJobResponse>> {
    // 1. **SEGURIDAD:** Validar token CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Validar que CRON_SECRET existe y no está vacío
    if (!cronSecret || cronSecret.length < 10) {
        console.error('CRON_SECRET not properly configured');
        return NextResponse.json(
            { success: false, message: 'Server misconfiguration' },
            { status: 500 }
        );
    }

    // Validar token
    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron attempt:', { authHeader: authHeader?.substring(0, 10) });
        return NextResponse.json(
            { success: false, message: 'Acceso no autorizado' },
            { status: 401 }
        );
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
        logInfo('Iniciando generación de frase', { requestId });

        // 2. **VALIDAR CONFIGURACIÓN DE API**
        if (!apiKey || apiKey.length < 10) {
            logError('GEMINI_API_KEY not configured', { requestId });
            return NextResponse.json(
                { success: false, message: 'Server misconfiguration' },
                { status: 500 }
            );
        }

        // 3. **GENERAR FRASE CON RETRY**
        const retryOptions: RetryOptions = {
            maxAttempts: 5,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
            jitterFactor: 0.15,
            onRetry: (attempt, error, nextDelayMs) => {
                logWarn(`Retry intento ${attempt} después de error`, {
                    requestId,
                    error: error instanceof Error ? error.message : String(error),
                    nextDelayMs,
                });
            },
        };

        const result = await withExponentialBackoff(
            () => generateAndStorePhrase(ai, supabase, POETA_PROMPT, requestId),
            retryOptions
        );

        if (!result.success) {
            const errorMsg = result.error instanceof Error
                ? result.error.message
                : 'Unknown error';
            
            logError('Falló la generación de frase después de reintentos', {
                requestId,
                attempts: result.attempts,
                totalTimeMs: result.totalTimeMs,
                error: errorMsg,
            });

            return NextResponse.json(
                { success: false, message: `Falló al generar la frase después de ${result.attempts} intentos` },
                { status: 500 }
            );
        }

        const duration = Date.now() - startTime;
        logInfo('Frase generada exitosamente', {
            requestId,
            attempts: result.attempts,
            durationMs: duration,
        });

        return NextResponse.json(
            { success: true, message: `Se insertó una frase correctamente (${result.attempts} intentos).` },
            { status: 200 }
        );

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        logError('Error no esperado en Cron Job', {
            requestId,
            durationMs: duration,
            error: errorMsg,
            stack: error instanceof Error ? error.stack : undefined,
        });

        return NextResponse.json(
            { success: false, message: 'Error interno en la generación de IA.' },
            { status: 500 }
        );
    }
}

// Función extraída: genera la frase con Gemini, parsea, valida e inserta en Supabase
const generateAndStorePhrase = async (
    ai: GoogleGenAI,
    supabaseClient: typeof supabase,
    prompt: string,
    requestId: string
): Promise<PhraseResponse> => {
    // 2. **GENERACIÓN DE LA FRASE CON VALIDACIÓN ROBUSTA**
    logInfo('Llamando API de Gemini', { requestId });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
        }
    });

    // Validar que obtuvo respuesta
    if (!response || !response.text) {
        throw new Error('Gemini API no retornó contenido de texto');
    }

    logInfo('Respuesta de Gemini recibida', {
        requestId,
        responseLength: response.text.length,
        preview: response.text.substring(0, 50),
    });

    // 3. **PARSEAR Y VALIDAR JSON CON MANEJO ROBUSTO DE ERRORES**
    const jsonText = response.text.trim();
    let phraseData: PhraseResponse;

    try {
        phraseData = safeJsonParse<PhraseResponse>(jsonText, ['category', 'message']);
    } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        logError('Error parseando respuesta JSON de Gemini', {
            requestId,
            error: errorMsg,
            responsePreview: jsonText.substring(0, 100),
        });
        throw new Error(`JSON Parse Error: ${errorMsg}`);
    }

    // Validaciones adicionales del contenido
    if (!phraseData.category || typeof phraseData.category !== 'string') {
        throw new Error(`Invalid category: ${phraseData.category}`);
    }

    if (!phraseData.message || typeof phraseData.message !== 'string') {
        throw new Error(`Invalid message: ${phraseData.message}`);
    }

    // Validar largo de mensaje (máximo 15 palabras según prompt)
    const wordCount = phraseData.message.split(/\s+/).length;
    if (wordCount > 20) {
        logWarn('Frase excede límite de palabras', {
            requestId,
            wordCount,
            message: phraseData.message,
        });
    }

    logInfo('Frase validada correctamente', {
        requestId,
        category: phraseData.category,
        wordCount,
    });

    // 4. **INSERCIÓN EN SUPABASE CON MANEJO DE ERRORES**
    const supabaseData: SupabasePhrase = {
        texto: phraseData.message,
        categoria: phraseData.category,
        fecha_creacion: new Date().toISOString(),
        fecha_ultimo_uso: null
    };

    logInfo('Insertando frase en Supabase', { requestId });

    const { error: insertError, data: insertedData } = await supabaseClient
        .from('frases')
        .insert([supabaseData])
        .select();
    
    if (insertError) {
        logError('Error insertando frase en Supabase', {
            requestId,
            error: insertError.message,
            code: insertError.code,
        });
        throw new Error(`Database Insert Error: ${insertError.message}`);
    }

    logInfo('Frase insertada exitosamente en Supabase', {
        requestId,
        insertedRecords: insertedData?.length || 0,
    });

    return phraseData;
}