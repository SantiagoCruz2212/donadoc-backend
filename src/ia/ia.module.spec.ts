import { ConfigService } from '@nestjs/config';
import { GeminiExtractor } from './adapters/gemini.extractor';
import { GroqExtractor } from './adapters/groq.extractor';
import { MockExtractor } from './adapters/mock.extractor';
import { OllamaExtractor } from './adapters/ollama.extractor';
import { crearExtractor } from './ia.module';

const config = (valores: Record<string, string>) => ({ get: (k: string) => valores[k] }) as unknown as ConfigService;

describe('crearExtractor (el proveedor de IA se elige por configuración)', () => {
  it.each([
    ['groq', GroqExtractor, 'GROQ'],
    ['gemini', GeminiExtractor, 'GEMINI'],
    ['ollama', OllamaExtractor, 'OLLAMA'],
    ['mock', MockExtractor, undefined],
  ])('EXTRACTOR_IA_PROVIDER=%s crea el adaptador correspondiente', (proveedor, clase, nombre) => {
    const e = crearExtractor(config({ EXTRACTOR_IA_PROVIDER: proveedor, GROQ_API_KEY: 'k', GROQ_MODEL: 'm', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm', OLLAMA_URL: 'http://x', OLLAMA_MODEL: 'm' }));
    expect(e).toBeInstanceOf(clase);
    if (nombre) expect(e.nombre).toBe(nombre);
  });

  it('un valor desconocido o ausente cae en Gemini, como antes de agregar Groq', () => {
    expect(crearExtractor(config({ GEMINI_MODEL: 'm' }))).toBeInstanceOf(GeminiExtractor);
  });
});
