import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db'; // Módulo de conexión a Supabase
import { PhraseResponse } from '@/lib/types';

/**
 * Handles GET requests to retrieve and rotate a single positive phrase.
 * This is the BFF endpoint consumed by the FraseDisplay component.
 */
export async function GET(request: NextRequest) {
    try {
        // 1. SELECCIÓN DE LA FRASE CON ROTACIÓN
        // Seleccionamos la frase con la 'fecha_ultimo_uso' más antigua (NULL primero)
        // Esto garantiza que las frases nuevas o no usadas se prioricen.
        
        console.info("Fetching phrase from database with rotation logic.");
        const { data: frases, error: selectError } = await supabase
            .from('frases')
            .select('id, texto, categoria')
            .order('fecha_ultimo_uso', { ascending: true, nullsFirst: true })
            .limit(1);
        
        if (selectError) {
            throw new Error(selectError.message);
        }
        
        console.info("Phrase selection result:", frases);
        // 2. VERIFICACIÓN DE RESULTADO
        if (!frases || frases.length === 0) {
             // Devolver un error específico si la BD está vacía (antes de que el Cron Job haya generado frases)
             return NextResponse.json({ 
                success: false, 
                message: 'No hay frases disponibles... Por favor, intenta más tarde.' 
            }, { status: 404 });
        }

        const selectedFrase = frases[0];
        const { id, texto, categoria } = selectedFrase;

        console.log(`Selected phrase ID: ${id}, Text: ${texto}, Category: ${categoria}`);
        console.log("Updating phrase usage timestamp for rotation.");
        // 3. ACTUALIZACIÓN DEL REGISTRO DE USO (ROTACIÓN)
        // Actualizar el timestamp de 'fecha_ultimo_uso' para esta frase.
        // Esto la mueve al final de la cola de selección, garantizando la rotación.
        const { error: updateError } = await supabase
            .from('frases')
            .update({ fecha_ultimo_uso: new Date().toISOString() })
            .eq('id', id);
        
        if (updateError) {
            throw new Error(updateError.message);
        }

        const response: PhraseResponse = {
            message: texto,
            category: categoria,
        }
        // 4. RESPUESTA EXITOSA
        return NextResponse.json({
            success: true,
            phrase: response
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching phrase:', error);
        
        // Devolver un error 500 para fallos del servidor/BD
        return NextResponse.json({ 
            success: false, 
            message: 'Oops! Hubo un error al obtener la frase.' 
        }, { status: 500 });
    }
}