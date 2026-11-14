import { ExtraerConIaService } from './extraer-con-ia.service';
import { ExtractorIa, ExtractorIaError, ResultadoExtraccion } from './ports/extractor-ia.port';

const user = { userId: 'u1', organizacionId: 'o1', rol: 'ADMIN_ORG' };

function crear(extractor: Partial<ExtractorIa>, cfgExtra: Record<string, unknown> = {}) {
  const sugerenciasGuardadas: Record<string, unknown>[] = [];
  const extracciones = {
    create: (x: object) => ({ ...x }),
    save: jest.fn(async (x: Record<string, unknown>) => { x.id = x.id ?? 'e1'; x.solicitadoEn = new Date(); return x; }),
    update: jest.fn(async () => undefined),
  };
  const sugerencias = {
    create: (x: object) => ({ ...x }),
    save: jest.fn(async (xs: Record<string, unknown>[]) => { xs.forEach((x, i) => { x.id = `s${i}`; sugerenciasGuardadas.push(x); }); return xs; }),
  };
  const documentos = { obtenerDeCaso: jest.fn(async () => ({ id: 'd1' })), leerTexto: jest.fn(async () => 'Diagnóstico principal: TCE severo') };
  const cfg = { get: (k: string) => ({ IA_MAX_INTENTOS: 2, IA_TIMEOUT_MS: 2000, IA_BACKOFF_MS: 0, IA_UMBRAL_CONFIANZA: 0.7, ...cfgExtra } as Record<string, unknown>)[k] };
  const audit = { log: jest.fn(async () => undefined) };
  const base = { externo: false, nombre: 'FAKE' };
  const svc = new ExtraerConIaService(extracciones as never, sugerencias as never, documentos as never, {} as never, { ...base, ...extractor } as never, cfg as never, audit as never);
  return { svc, extracciones, sugerenciasGuardadas, documentos, audit };
}

const ok = (sug: { campo: string; valor: string; confianza: number }[]): ResultadoExtraccion => ({ proveedor: 'FAKE', modelo: 'm', sugerencias: sug });

describe('ExtraerConIaService (caso de uso de extracción con IA)', () => {
  it('guarda las sugerencias con confianza >= 70 % y descarta las demás (PROCESADA)', async () => {
    const { svc, sugerenciasGuardadas } = crear({ extraer: async () => ok([{ campo: 'diagnosticoPrincipal', valor: 'TCE severo', confianza: 0.91 }, { campo: 'grupoSanguineo', valor: 'O+', confianza: 0.4 }]) });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(r.extraccion.estado).toBe('PROCESADA');
    expect(r.extraccion.sugerencias).toHaveLength(1);
    expect(sugerenciasGuardadas[0]).toMatchObject({ campo: 'diagnosticoPrincipal', decision: 'PENDIENTE' });
  });

  it('si ninguna sugerencia alcanza el umbral, se abstiene (ABSTENCION) y no propone datos', async () => {
    const { svc, sugerenciasGuardadas } = crear({ extraer: async () => ok([{ campo: 'causaMuerte', valor: 'no está claro', confianza: 0.3 }]) });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(r.extraccion.estado).toBe('ABSTENCION');
    expect(r.extraccion.sugerencias).toHaveLength(0);
    expect(sugerenciasGuardadas).toHaveLength(0);
  });

  it('persiste primero: la extracción PENDIENTE se guarda antes de llamar al proveedor', async () => {
    const orden: string[] = [];
    const { svc, extracciones } = crear({ extraer: async () => { orden.push('proveedor'); return ok([]); } });
    extracciones.save.mockImplementationOnce(async (x: Record<string, unknown>) => { orden.push('guardar'); x.id = 'e1'; return x; });
    await svc.ejecutar(user, 'c1', 'd1');
    expect(orden.slice(0, 2)).toEqual(['guardar', 'proveedor']);
  });

  it('reintenta de forma acotada ante un error del proveedor y deja la extracción PENDIENTE', async () => {
    const extraer = jest.fn(async () => { throw new ExtractorIaError('PROVEEDOR', 'caído'); });
    const { svc, audit } = crear({ extraer });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(extraer).toHaveBeenCalledTimes(2); // IA_MAX_INTENTOS = 2
    expect(r.extraccion.estado).toBe('PENDIENTE');
    expect(r.extraccion.intentos).toBe(2);
    expect(r.mensaje).toMatch(/pendiente/i);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'IA_FALLO' }));
  });

  it('no reintenta si se agotó la cuota del proveedor', async () => {
    const extraer = jest.fn(async () => { throw new ExtractorIaError('CUOTA', 'cuota'); });
    const { svc } = crear({ extraer });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(extraer).toHaveBeenCalledTimes(1);
    expect(r.extraccion.estado).toBe('PENDIENTE');
    expect(r.mensaje).toMatch(/límite/i);
  });

  it('si el proveedor no está configurado, lo dice claramente y no reintenta', async () => {
    const extraer = jest.fn(async () => { throw new ExtractorIaError('CONFIGURACION', 'sin clave'); });
    const { svc } = crear({ extraer });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(extraer).toHaveBeenCalledTimes(1);
    expect(r.mensaje).toMatch(/no está configurado/i);
  });

  it('una respuesta inválida del proveedor termina en ERROR sin reintentar', async () => {
    const extraer = jest.fn(async () => { throw new ExtractorIaError('RESPUESTA_INVALIDA', 'no es JSON'); });
    const { svc } = crear({ extraer });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(extraer).toHaveBeenCalledTimes(1);
    expect(r.extraccion.estado).toBe('ERROR');
  });

  it('aplica un tiempo de espera: un proveedor que nunca responde deja la extracción PENDIENTE', async () => {
    const extraer = jest.fn(() => new Promise<ResultadoExtraccion>(() => undefined));
    const { svc } = crear({ extraer }, { IA_TIMEOUT_MS: 30 });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(extraer).toHaveBeenCalledTimes(2);
    expect(r.extraccion.estado).toBe('PENDIENTE');
  });
});
