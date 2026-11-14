import { CAMPOS_HISTORIA, ExtractorIaError } from '../ports/extractor-ia.port';
import { OllamaExtractor } from './ollama.extractor';

const solicitud = { texto: 'Paciente CC 1000000001. Diagnóstico principal: sepsis.', campos: CAMPOS_HISTORIA };
const generar = (obj: unknown) => ({ response: JSON.stringify(obj) });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

describe('OllamaExtractor', () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  afterEach(() => fetchMock.mockReset());
  afterAll(() => fetchMock.mockRestore());

  const extractor = () => new OllamaExtractor('http://127.0.0.1:11434/', 'llama3.2:3b');
  const falla = async (p: Promise<unknown>) => p.then(() => null, (e: ExtractorIaError) => e);

  it('llama a /api/generate sin streaming, pide JSON y temperatura 0, y no enmascara (el dato no sale del equipo)', async () => {
    fetchMock.mockResolvedValue(json(generar({ diagnosticoPrincipal: { valor: 'sepsis', confianza: 0.8 } })));
    const r = await extractor().extraer(solicitud);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/api/generate'); // la barra final de la URL base se ignora
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo).toMatchObject({ model: 'llama3.2:3b', stream: false, format: 'json', options: { temperature: 0 } });
    expect(cuerpo.prompt).toContain('1000000001');
    expect(r).toEqual({ proveedor: 'OLLAMA', modelo: 'llama3.2:3b', sugerencias: [{ campo: 'diagnosticoPrincipal', valor: 'sepsis', confianza: 0.8 }] });
  });

  it('un 404 significa que el modelo no está descargado (CONFIGURACION) y un 500 es PROVEEDOR', async () => {
    fetchMock.mockResolvedValue(json({ error: 'model not found' }, 404));
    const e = await falla(extractor().extraer(solicitud));
    expect(e?.tipo).toBe('CONFIGURACION');
    expect(e?.message).toContain('llama3.2:3b');
    fetchMock.mockResolvedValue(json({}, 500));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('PROVEEDOR');
  });

  it('si Ollama no está en ejecución es PROVEEDOR; una señal abortada es TIMEOUT', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('PROVEEDOR');

    const abortada = new AbortController();
    abortada.abort();
    fetchMock.mockRejectedValue(Object.assign(new Error('abortado'), { name: 'AbortError' }));
    expect((await falla(extractor().extraer(solicitud, abortada.signal)))?.tipo).toBe('TIMEOUT');
  });

  it('una respuesta vacía o que no es JSON es RESPUESTA_INVALIDA', async () => {
    fetchMock.mockResolvedValue(json({}));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
    fetchMock.mockResolvedValue(json({ response: 'lo siento, no puedo' }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
  });

  it('es IA en el borde: los datos no salen de la institución', () => {
    expect(extractor().externo).toBe(false);
  });
});
