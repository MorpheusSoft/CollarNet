import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Convierte un buffer de archivo en la estructura de datos inline que requiere la API de Gemini
 */
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

/**
 * Analiza un documento PDF (plano, catastro o título) usando Gemini 1.5 y extrae los vértices del Hato
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF cargado
 * @returns {Promise<{nombre: string, vertices: Array<Array<number>>}>} Objeto con el nombre y vértices de la geocerca
 */
export async function extractGeofenceFromPDF(pdfBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'REEMPLAZAR_CON_TU_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn('[Gemini IA] GEMINI_API_KEY no configurado o es marcador de posición. Usando simulación de extracción.');
    return {
      nombre: 'Hato La Esperanza (IA Simulado)',
      vertices: [
        [9.102, -67.102],
        [9.102, -67.098],
        [9.098, -67.098],
        [9.098, -67.102]
      ]
    };
  }

  // Inicializar cliente Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Utilizar el modelo gemini-1.5-flash para análisis rápido de documentos
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const pdfPart = bufferToGenerativePart(pdfBuffer, 'application/pdf');

  const prompt = `
    Analiza detalladamente este plano catastral, estudio topográfico, mapa de mensura o título de propiedad.
    Tu objetivo es identificar las coordenadas geográficas de los linderos, vértices o límites que definen el perímetro principal del predio o hato.

    Extrae la secuencia ordenada de coordenadas geográficas en formato decimal (Latitud, Longitud) de los vértices que cierran el polígono del hato.

    Debes responder únicamente con un objeto JSON válido con la siguiente estructura exacta:
    {
      "nombre": "Nombre sugerido para el Hato extraído del documento",
      "vertices": [
        [latitud1, longitud1],
        [latitud2, longitud2],
        ...
      ]
    }

    Reglas críticas de conversión:
    1. Si las coordenadas en el plano están en formato UTM (ej: huso 19N o 20N, coordenadas X/Y de 6 dígitos), realiza una estimación/conversión a coordenadas geográficas WGS84 decimales.
    2. Las coordenadas decimales en Venezuela típicamente se sitúan en:
       - Latitud: entre 8.0 y 11.5
       - Longitud: entre -73.0 y -61.0
       Usa el contexto del documento para ubicar el predio en esa escala.
    3. Si no encuentras coordenadas explícitas pero hay un croquis/mapa o descripción de linderos, estima los vértices de manera razonable para simular el predio en el mapa satelital.
    4. El arreglo de vértices debe contener al menos 3 o 4 puntos en orden consecutivo para formar un polígono válido y cerrado.
  `;

  try {
    console.log('[Gemini IA] Enviando PDF para análisis de linderos...');
    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    const text = response.text();
    console.log('[Gemini IA] Respuesta JSON recibida:', text);
    
    const parsed = JSON.parse(text);
    if (!parsed.vertices || !Array.isArray(parsed.vertices) || parsed.vertices.length < 3) {
      throw new Error('La IA no pudo extraer suficientes vértices válidos del documento.');
    }
    
    return {
      nombre: parsed.nombre || 'Hato Catastrado con IA',
      vertices: parsed.vertices
    };
  } catch (err) {
    console.error('[Gemini IA Error] Fallo al extraer geocerca:', err);
    throw new Error(`Error en el análisis de IA: ${err.message}`);
  }
}
