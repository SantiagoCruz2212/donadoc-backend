import { CAMPOS_HISTORIA, ExtractorIaError } from '../ports/extractor-ia.port';
import { GroqExtractor } from './groq.extractor';

const solicitud = { texto: 'Paciente CC 1000000001, correo juan@correo.com. Diagnóstico principal: sepsis.', campos: CAMPOS_HISTORIA };
const respuestaModelo = (obj: unknown) => ({ choices: [{ message: { role: 'assistant', content: JSON.stringify(obj) } }] });
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

describe('GroqExtractor', () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  afterEach(() => fetchMock.mockReset());
  afterAll(() => fetchMock.mockRestore());

  const extractor = () => new GroqExtractor('clave-de-prueba', 'openai/gpt-oss-120b');
  const falla = async (p: Promise<unknown>) => p.then(() => null, (e: ExtractorIaError) => e);

  it('sin clave configurada falla con CONFIGURACION y ni siquiera llama a la red', async () => {
    const e = await falla(new GroqExtractor('', 'm').extraer(solicitud));
    expect(e).toBeInstanceOf(ExtractorIaError);
    expect(e?.tipo).toBe('CONFIGURACION');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía la clave en la cabecera Authorization (nunca en la URL), pide JSON determinista y enmascara identificadores', async () => {
    fetchMock.mockResolvedValue(json(respuestaModelo({ diagnosticoPrincipal: { valor: 'sepsis', confianza: 0.9 } })));
    const r = await extractor().extraer(solicitud);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(url).not.toContain('clave-de-prueba');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer clave-de-prueba');
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo.model).toBe('openai/gpt-oss-120b');
    expect(cuerpo.temperature).toBe(0);
    expect(cuerpo.response_format).toEqual({ type: 'json_object' });
    const prompt = cuerpo.messages[0].content as string;
    expect(cuerpo.messages[0].role).toBe('user');
    expect(prompt).not.toMatch(/1000000001|juan@correo/);
    expect(prompt).toContain('[ID]');
    expect(r).toEqual({ proveedor: 'GROQ', modelo: 'openai/gpt-oss-120b', sugerencias: [{ campo: 'diagnosticoPrincipal', valor: 'sepsis', confianza: 0.9 }] });
  });

  it('permite cambiar la URL base y tolera una barra final', async () => {
    fetchMock.mockResolvedValue(json(respuestaModelo({})));
    await new GroqExtractor('k', 'm', 'http://localhost:9999/v1/').extraer(solicitud);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:9999/v1/chat/completions');
  });

  it.each([
    [429, 'CUOTA'],
    [401, 'CONFIGURACION'],
    [403, 'CONFIGURACION'],
    [404, 'CONFIGURACION'],
    [500, 'PROVEEDOR'],
    [503, 'PROVEEDOR'],
  ])('un estado HTTP %i se traduce a %s', async (status, tipo) => {
    fetchMock.mockResolvedValue(json({ error: { message: 'x' } }, status));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe(tipo);
  });

  it.each([
    ['model_decommissioned', 'CONFIGURACION'],
    ['model_not_found', 'CONFIGURACION'],
    ['json_validate_failed', 'RESPUESTA_INVALIDA'],
    ['otro_codigo', 'PROVEEDOR'],
  ])('un 400 con el código «%s» se traduce a %s', async (code, tipo) => {
    fetchMock.mockResolvedValue(json({ error: { code, message: 'x' } }, 400));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe(tipo);
  });

  it('un 400 sin cuerpo legible es PROVEEDOR', async () => {
    fetchMock.mockResolvedValue(new Response('no es json', { status: 400 }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('PROVEEDOR');
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
    fetchMock.mockResolvedValue(json({ choices: [] }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
    fetchMock.mockResolvedValue(json({ choices: [{ message: { content: 'no soy json' } }] }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
    fetchMock.mockResolvedValue(new Response('no es json', { status: 200 }));
    expect((await falla(extractor().extraer(solicitud)))?.tipo).toBe('RESPUESTA_INVALIDA');
  });

  it('es un proveedor externo (los datos salen de la institución)', () => {
    expect(extractor().externo).toBe(true);
    expect(extractor().nombre).toBe('GROQ');
  });
});
