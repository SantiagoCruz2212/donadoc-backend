import { AuditService } from './audit.service';

describe('AuditService.log (quién hizo qué y cuándo)', () => {
  it('inserta el evento con todos sus campos', async () => {
    const insert = jest.fn(async () => undefined);
    await new AuditService({ insert } as never).log({
      organizacionId: 'org-1', usuarioId: 'u1', entidad: 'caso', entidadId: 'c1', accion: 'CREAR', valorAnterior: { a: 1 }, valorNuevo: { a: 2 }, ip: '10.0.0.1',
    });
    expect(insert).toHaveBeenCalledWith({
      organizacionId: 'org-1', usuarioId: 'u1', entidad: 'caso', entidadId: 'c1', accion: 'CREAR', valorAnterior: { a: 1 }, valorNuevo: { a: 2 }, ip: '10.0.0.1',
      metodo: null, ruta: null, estadoHttp: null,
    });
  });

  it('guarda el contexto HTTP (método, ruta recortada a 200 y estado) cuando viene', async () => {
    const insert = jest.fn(async () => undefined);
    await new AuditService({ insert } as never).log({ entidad: 'caso', accion: 'CONSULTAR', metodo: 'GET', ruta: '/casos/' + 'x'.repeat(300), estadoHttp: 200 });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ metodo: 'GET', estadoHttp: 200, ruta: ('/casos/' + 'x'.repeat(300)).slice(0, 200) }));
  });

  it('los campos opcionales ausentes se guardan como nulos', async () => {
    const insert = jest.fn(async () => undefined);
    await new AuditService({ insert } as never).log({ entidad: 'sesion', accion: 'LOGIN_FALLIDO' });
    expect(insert).toHaveBeenCalledWith({
      organizacionId: null, usuarioId: null, entidad: 'sesion', entidadId: null, accion: 'LOGIN_FALLIDO', valorAnterior: null, valorNuevo: null, ip: null, metodo: null, ruta: null, estadoHttp: null,
    });
  });

  it('un fallo al auditar NO tumba la operación principal (no propaga el error)', async () => {
    const insert = jest.fn(async () => { throw new Error('base de datos caída'); });
    await expect(new AuditService({ insert } as never).log({ entidad: 'caso', accion: 'CREAR' })).resolves.toBeUndefined();
  });
});
