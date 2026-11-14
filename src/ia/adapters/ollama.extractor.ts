import { ExtractorIa, ExtractorIaError, ResultadoExtraccion, SolicitudExtraccion } from '../ports/extractor-ia.port';
import { construirPrompt, parsearRespuesta } from '../prompt';

/**
 * Adaptador de IA en el borde con Ollama: el modelo corre en la propia máquina o servidor,
 * gratis y sin que los datos salgan de la institución.
 */
export class OllamaExtractor extends ExtractorIa {
  readonly externo = false;
  readonly nombre = 'OLLAMA';

  constructor(private readonly url: string, private readonly modelo: string) {
    super();
  }

  async extraer(s: SolicitudExtraccion, signal?: AbortSignal): Promise<ResultadoExtraccion> {
    let res: Response;
    try {
      res = await fetch(`${this.url.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.modelo, prompt: construirPrompt(s), stream: false, format: 'json', options: { temperature: 0 } }),
        signal,
      });
    } catch (e) {
      if (signal?.aborted || (e as Error).name === 'AbortError') throw new ExtractorIaError('TIMEOUT', 'Tiempo de espera agotado');
      throw new ExtractorIaError('PROVEEDOR', 'No se pudo contactar al modelo local (Ollama)');
    }
    if (res.status === 404) throw new ExtractorIaError('CONFIGURACION', `El modelo ${this.modelo} no está descargado en Ollama`);
    if (!res.ok) throw new ExtractorIaError('PROVEEDOR', `Ollama respondió con estado ${res.status}`);
    const cuerpo = (await res.json()) as { response?: string };
    if (!cuerpo.response) throw new ExtractorIaError('RESPUESTA_INVALIDA', 'Ollama no devolvió contenido');
    return { proveedor: this.nombre, modelo: this.modelo, sugerencias: parsearRespuesta(cuerpo.response, s) };
  }
}
