import { ExtractorIa, ExtractorIaError, ResultadoExtraccion, SolicitudExtraccion } from '../ports/extractor-ia.port';
import { construirPrompt, enmascararIdentificadores, parsearRespuesta } from '../prompt';

/**
 * Adaptador de la API de Gemini (Google AI Studio, capa gratuita; límites sujetos a cambio, verificar en AI Studio).
 * La clave viaja en una cabecera, nunca en la URL, y no se registra en ningún log.
 */
export class GeminiExtractor extends ExtractorIa {
  readonly externo = true;
  readonly nombre = 'GEMINI';

  constructor(private readonly apiKey: string, private readonly modelo: string) {
    super();
  }

  async extraer(s: SolicitudExtraccion, signal?: AbortSignal): Promise<ResultadoExtraccion> {
    if (!this.apiKey) throw new ExtractorIaError('CONFIGURACION', 'GEMINI_API_KEY no está configurada');
    const prompt = construirPrompt({ ...s, texto: enmascararIdentificadores(s.texto) });
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
        signal,
      });
    } catch (e) {
      if (signal?.aborted || (e as Error).name === 'AbortError') throw new ExtractorIaError('TIMEOUT', 'Tiempo de espera agotado');
      throw new ExtractorIaError('PROVEEDOR', 'No se pudo contactar al proveedor de IA');
    }
    if (res.status === 429) throw new ExtractorIaError('CUOTA', 'Límite de cuota del proveedor de IA alcanzado');
    if (res.status === 401 || res.status === 403) throw new ExtractorIaError('CONFIGURACION', 'Credencial de IA rechazada por el proveedor');
    if (!res.ok) throw new ExtractorIaError('PROVEEDOR', `El proveedor respondió con estado ${res.status}`);

    const cuerpo = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const texto = cuerpo.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new ExtractorIaError('RESPUESTA_INVALIDA', 'El proveedor no devolvió contenido');
    return { proveedor: this.nombre, modelo: this.modelo, sugerencias: parsearRespuesta(texto, s) };
  }
}
