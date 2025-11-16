import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Módulo de conexión a Vercel Postgres
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
        
        const selectionResult = await db.query(
            `
            SELECT id, texto, categoria
            FROM frases
            ORDER BY fecha_ultimo_uso ASC NULLS FIRST
            LIMIT 1
            `
        );
        
        // 2. VERIFICACIÓN DE RESULTADO
        if (selectionResult.rows.length === 0) {
             // Devolver un error específico si la BD está vacía (antes de que el Cron Job haya generado frases)
             return NextResponse.json({ 
                success: false, 
                message: 'No hay frases disponibles... Por favor, intenta más tarde.' 
            }, { status: 404 });
        }

        const selectedFrase = selectionResult.rows[0];
        const { id, texto, categoria } = selectedFrase;

        // 3. ACTUALIZACIÓN DEL REGISTRO DE USO (ROTACIÓN)
        // Actualizar el timestamp de 'fecha_ultimo_uso' para esta frase.
        // Esto la mueve al final de la cola de selección, garantizando la rotación.
        await db.query(
            `
            UPDATE frases
            SET fecha_ultimo_uso = NOW()
            WHERE id = $1
            `,
            [id]
        );

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