import { CAMPOS_HISTORIA, ExtractorIaError } from '../ports/extractor-ia.port';
import { GeminiExtractor } from './gemini.extractor';

const solicitud = { texto: 'Paciente CC 1000000001, correo juan@correo.com. Diagnóstico principal: sepsis.', campos: CAMPOS_HISTORIA };
const respuestaModelo = (obj: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

describe('GeminiExtractor', () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  afterEach(() => fetchMock.mockReset());
  afterAll(() => fetchMock.mockRestore());

  const extractor = () => new GeminiExtractor('clave-de-prueba', 'gemini-2.5-flash');
  const falla = async (p: Promise<unknown>) => p.then(() => null, (e: ExtractorIaError) => e);

  it('sin clave configurada falla con CONFIGURACION y ni siquiera llama a la red', async () => {
    const e = await falla(new GeminiExtractor('', 'm').extraer(solicitud));
    expect(e).toBeInstanceOf(ExtractorIaError);
    expect(e?.tipo).toBe('CONFIGURACION');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía la clave en una cabecera (nunca en la URL), pide JSON determinista y enmascara identificadores', async () => {
    fetchMock.mockResolvedValue(json(respuestaModelo({ diagnosticoPrincipal: { valor: 'sepsis', confianza: 0.9 } })));
    const r = await extractor().extraer(solicitud);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('clave-de-prueba');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('clave-de-prueba');
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo.generationConfig).toEqual({ temperature: 0, responseMimeType: 'application/json' });
    const prompt = cuerpo.contents[0].parts[0].text as string;
    expect(prompt).not.toMatch(/1000000001|juan@correo/);
    expect(prompt).toContain('[ID]');
    expect(r).toEqual({ proveedor: 'GEMINI', modelo: 'gemini-2.5-flash', sugerencias: [{ campo: 'diagnosticoPrincipal', valor: 'sepsis', confianza: 0.9 }] });
  });

  it.each([
    [429, 'CUOTA'],
    [401, 'CONFIGURACION'],
    [403, 'CONFIGURACION'],
    [500, 'PROVEEDOR'],
    [503, 'PROVEEDOR'],
  ])('un estado HTTP %i se traduce a %s', async (status, tipo) => {
    fetchMock.mockResolvedValue(json({ error: 'x' }, status));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe(tipo);
  });

  it('un fallo de red es PROVEEDOR y una señal abortada es TIMEOUT', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('PROVEEDOR');

    const abortada = new AbortController();
    abortada.abort();
    fetchMock.mockRejectedValue(Object.assign(new Error('abortado'), { name: 'AbortError' }));
    expect((await falla(extractor().extraer(solicitud, abortada.signal)))?.tipo).toBe('TIMEOUT');
  });

  it('una respuesta sin contenido o que no es JSON es RESPUESTA_INVALIDA', async () => {
    fetchMock.mockResolvedValue(json({ candidates: [] }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
    fetchMock.mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: 'no soy json' }] } }] }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
  });

  it('es un proveedor externo (los datos salen de la institución)', () => {
    expect(extractor().externo).toBe(true);
  });
});
