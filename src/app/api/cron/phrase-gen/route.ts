import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai'; // Asume la instalación del SDK de Gemini
import { db } from '@/lib/db'; // Asume un módulo de conexión a Vercel Postgres
import { PhraseResponse } from '@/lib/types';

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
const maxRetries = 10; // Número máximo de reintentos para generación de frases

export async function GET(request: NextRequest) {
    // 1. **SEGURIDAD:** Solo permitir invocación desde Vercel (clave secreta)
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, message: 'Acceso no autorizado' }, { status: 401 });
    }

    try {
        let phraseData: { category: string; message: string } | null = null;
        let attemptCount = 0;

        // Intentos por cada frase individual
        do {
            try {
                phraseData = await generateAndStorePhrase(ai, db, POETA_PROMPT);
            } catch (err) {
                // Si la función lanza, lo tratamos como fallo y reintentamos
                console.error(`Error generando/guardando frase (intento ${attemptCount + 1}):`, err);
                phraseData = null;
            }

            if (!phraseData) {
                // Esperar un poco antes de reintentar
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            attemptCount++;
        } while (!phraseData && attemptCount < maxRetries);

        // Si tras los reintentos no hay frase válida, devolvemos error indicando cuántas se insertaron
        if (!phraseData) {
            return NextResponse.json({ success: false, message: `Falló al generar la frase` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Se insertó una frase correctamente.` }, { status: 200 });

    } catch (error) {
        console.error('Error en el Cron Job de IA:', error);
        return NextResponse.json({ success: false, message: 'Error interno en la generación de IA.' }, { status: 500 });
    }
}

// Función extraída: genera la frase con Gemini, parsea, valida e inserta en Postgres
const generateAndStorePhrase = async (ai: any, db: any, prompt: string): Promise<{ category: string; message: string } | null> => {
    // 2. **GENERACIÓN DE LA FRASE**
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
        }
    });

    if (!response.text) {
        console.error('Gemini API did not return text content.');
        return null;
    }

    // 3. **PARSEAR Y VALIDAR**
    const jsonText = response.text.trim();
    let phraseData: PhraseResponse;
    try {
        phraseData = JSON.parse(jsonText);
    } catch (err) {
        throw new Error('Respuesta de IA no es JSON válido.');
    }

    if (!phraseData.category || !phraseData.message) {
        throw new Error('Respuesta de IA incompleta.');
    }

    // 4. **INSERCIÓN EN POSTGRES** (Asume la librería Vercel Postgres y `db` connection)
    await db.query(
        `INSERT INTO frases (id, texto, categoria, fecha_creacion, fecha_ultimo_uso)
             VALUES (uuid_generate_v4(), $1, $2, NOW(), NULL)`,
        [phraseData.message, phraseData.category]
    );

    return phraseData;
}