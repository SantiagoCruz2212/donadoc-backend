import { ExtraerConIaService } from './extraer-con-ia.service';

const user = { userId: 'u1', organizacionId: 'o1', rol: 'ADMIN_ORG' };

// Regresión del defecto DEF-01: si el archivo no se puede leer, la extracción no debe quedar PENDIENTE para siempre con un HTTP 500.
function crear(leerTexto: () => Promise<string>) {
  const extracciones = {
    create: (x: object) => ({ ...x }),
    save: jest.fn(async (x: Record<string, unknown>) => { x.id = x.id ?? 'e1'; x.solicitadoEn = new Date(); return x; }),
    update: jest.fn(async () => undefined),
  };
  const documentos = { obtenerDeCaso: jest.fn(async () => ({ id: 'd1' })), leerTexto: jest.fn(leerTexto) };
  const extractor = { externo: false, nombre: 'FAKE', extraer: jest.fn() };
  const audit = { log: jest.fn(async () => undefined) };
  const cfg = { get: () => undefined };
  const svc = new ExtraerConIaService(extracciones as never, {} as never, documentos as never, {} as never, extractor as never, cfg as never, audit as never);
  return { svc, extracciones, extractor, audit };
}

describe('ExtraerConIaService: documento ilegible (regresión DEF-01)', () => {
  it('si el archivo no se puede leer, la extracción termina en ERROR con un mensaje claro', async () => {
    const { svc } = crear(async () => { throw new Error('ENOENT: no such file'); });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(r.extraccion.estado).toBe('ERROR');
    expect(r.mensaje).toMatch(/No se pudo leer el documento/);
    expect(r.extraccion.sugerencias).toEqual([]);
  });

  it('no llama al proveedor de IA cuando el documento no se puede leer', async () => {
    const { svc, extractor } = crear(async () => { throw new Error('PDF dañado'); });
    await svc.ejecutar(user, 'c1', 'd1');
    expect(extractor.extraer).not.toHaveBeenCalled();
  });

  it('guarda el estado final y audita el incidente de lectura', async () => {
    const { svc, extracciones, audit } = crear(async () => { throw new Error('x'); });
    await svc.ejecutar(user, 'c1', 'd1');
    expect(extracciones.save).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'ERROR', respuestaJson: { incidente: 'LECTURA_DOCUMENTO' } }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'IA_FALLO', valorNuevo: { tipo: 'LECTURA_DOCUMENTO', estado: 'ERROR' } }));
  });

  it('no expone el detalle técnico del error de lectura en el mensaje', async () => {
    const { svc } = crear(async () => { throw new Error('ENOENT C:\\\\uploads\\\\secreto.txt'); });
    const r = await svc.ejecutar(user, 'c1', 'd1');
    expect(r.mensaje).not.toMatch(/ENOENT|uploads|secreto/);
  });
});
