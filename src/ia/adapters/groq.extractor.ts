import { ExtractorIa, ExtractorIaError, ResultadoExtraccion, SolicitudExtraccion } from '../ports/extractor-ia.port';
import { construirPrompt, enmascararIdentificadores, parsearRespuesta } from '../prompt';

/**
 * Adaptador de la API de Groq, compatible con el formato de OpenAI (`/chat/completions`).
 * La clave viaja en la cabecera Authorization, nunca en la URL, y no se registra en ningún log.
 * Es un proveedor externo: los identificadores se enmascaran antes de enviar el texto.
 * Los modelos disponibles y los límites de la capa gratuita cambian; verificarlos en console.groq.com/docs.
 */
export class GroqExtractor extends ExtractorIa {
  readonly externo = true;
  readonly nombre = 'GROQ';

  constructor(
    private readonly apiKey: string,
    private readonly modelo: string,
    private readonly baseUrl = 'https://api.groq.com/openai/v1',
  ) {
    super();
  }

  async extraer(s: SolicitudExtraccion, signal?: AbortSignal): Promise<ResultadoExtraccion> {
    if (!this.apiKey) throw new ExtractorIaError('CONFIGURACION', 'GROQ_API_KEY no está configurada');
    const prompt = construirPrompt({ ...s, texto: enmascararIdentificadores(s.texto) });
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.modelo,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal,
      });
    } catch (e) {
      if (signal?.aborted || (e as Error).name === 'AbortError') throw new ExtractorIaError('TIMEOUT', 'Tiempo de espera agotado');
      throw new ExtractorIaError('PROVEEDOR', 'No se pudo contactar al proveedor de IA');
    }
    if (res.status === 429) throw new ExtractorIaError('CUOTA', 'Límite de cuota del proveedor de IA alcanzado');
    if (res.status === 401 || res.status === 403) throw new ExtractorIaError('CONFIGURACION', 'Credencial de IA rechazada por el proveedor');
    if (res.status === 404) throw new ExtractorIaError('CONFIGURACION', `El modelo ${this.modelo} no está disponible en Groq`);
    if (!res.ok) throw await this.errorDeSolicitud(res);

    const cuerpo = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
    const texto = cuerpo.choices?.[0]?.message?.content;
    if (!texto) throw new ExtractorIaError('RESPUESTA_INVALIDA', 'El proveedor no devolvió contenido');
    return { proveedor: this.nombre, modelo: this.modelo, sugerencias: parsearRespuesta(texto, s) };
  }

  /** Un 400 puede ser un modelo retirado (configuración) o un JSON que el modelo no logró generar (respuesta inválida). */
  private async errorDeSolicitud(res: Response): Promise<ExtractorIaError> {
    const cuerpo = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
    const codigo = cuerpo.error?.code ?? '';
    if (codigo === 'model_decommissioned' || codigo === 'model_not_found') {
      return new ExtractorIaError('CONFIGURACION', `El modelo ${this.modelo} no está disponible en Groq`);
    }
    if (codigo === 'json_validate_failed') return new ExtractorIaError('RESPUESTA_INVALIDA', 'El modelo no devolvió un JSON válido');
    return new ExtractorIaError('PROVEEDOR', `El proveedor respondió con estado ${res.status}`);
  }
}
