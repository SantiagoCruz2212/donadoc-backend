import { NotFoundException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditoriaLecturasInterceptor, rastroDeRuta } from './auditoria-lecturas.interceptor';

const ID = '3f2b1c9e-5d4a-4e8b-9a7c-1d2e3f4a5b6c';

describe('rastroDeRuta', () => {
  it('usa el último segmento fijo como entidad y el último parámetro UUID como identificador', () => {
    expect(rastroDeRuta('/api/v1/casos/:casoId', { casoId: ID })).toEqual({ entidad: 'casos', entidadId: ID });
    expect(rastroDeRuta('/api/v1/casos/:casoId/documentos', { casoId: ID })).toEqual({ entidad: 'documentos', entidadId: ID });
    expect(rastroDeRuta('/api/v1/casos', {})).toEqual({ entidad: 'casos', entidadId: null });
  });

  it('no usa como identificador un valor que no es UUID', () => {
    expect(rastroDeRuta('/api/v1/casos/:casoId/formularios/:codigo', { casoId: ID, codigo: 'HC-DONANTE' })).toEqual({ entidad: 'formularios', entidadId: null });
  });
});

describe('AuditoriaLecturasInterceptor', () => {
  const audit = { log: jest.fn(async () => undefined) };
  const interceptor = new AuditoriaLecturasInterceptor(audit as never);
  const ctx = (req: Record<string, unknown>, status = 200) =>
    ({ getType: () => 'http', switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ statusCode: status }) }) }) as never;
  const user = { userId: 'u1', organizacionId: 'o1', rol: 'OPERADOR' };
  beforeEach(() => audit.log.mockClear());

  it('registra cada consulta (GET) con usuario, organización, ruta y estado, sin la cadena de consulta', async () => {
    const req = { method: 'GET', user, route: { path: '/api/v1/casos/:casoId' }, params: { casoId: ID }, originalUrl: `/api/v1/casos/${ID}?x=1`, ip: '10.0.0.1' };
    await lastValueFrom(interceptor.intercept(ctx(req), { handle: () => of({ ok: true }) }));
    expect(audit.log).toHaveBeenCalledWith({
      organizacionId: 'o1', usuarioId: 'u1', entidad: 'casos', entidadId: ID, accion: 'CONSULTAR', ip: '10.0.0.1', metodo: 'GET', ruta: `/api/v1/casos/${ID}`, estadoHttp: 200,
    });
  });

  it('también deja rastro de los intentos fallidos (p. ej. un caso ajeno devuelve 404) y relanza el error', async () => {
    const req = { method: 'GET', user, route: { path: '/api/v1/casos/:casoId' }, params: { casoId: ID }, originalUrl: `/api/v1/casos/${ID}` };
    await expect(lastValueFrom(interceptor.intercept(ctx(req), { handle: () => throwError(() => new NotFoundException()) }))).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CONSULTAR', estadoHttp: 404 }));
  });

  it('no registra rutas públicas (sin usuario) ni escrituras: esas las audita cada servicio', async () => {
    await lastValueFrom(interceptor.intercept(ctx({ method: 'GET', route: { path: '/health' } }), { handle: () => of(1) }));
    await lastValueFrom(interceptor.intercept(ctx({ method: 'POST', user, route: { path: '/api/v1/casos' } }), { handle: () => of(1) }));
    expect(audit.log).not.toHaveBeenCalled();
  });
});
