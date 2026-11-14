import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { QueryFailedFilter } from './query-failed.filter';

function contexto() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  const host = { switchToHttp: () => ({ getResponse: () => res }) };
  return { res, host: host as never };
}

describe('AllExceptionsFilter (formato único de error)', () => {
  const filtro = new AllExceptionsFilter();
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));

  it('convierte una HttpException con texto en { success:false, message }', () => {
    const { res, host } = contexto();
    filtro.catch(new ForbiddenException('No tiene permiso para esta acción'), host);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No tiene permiso para esta acción' });
  });

  it('conserva el estado HTTP de la excepción (404)', () => {
    const { res, host } = contexto();
    filtro.catch(new NotFoundException('Caso no encontrado'), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('incluye el detalle por campo cuando la excepción trae un arreglo error (validación)', () => {
    const { res, host } = contexto();
    const detalle = [{ property: 'donante.nombres', constraints: { isNotEmpty: 'nombres should not be empty' } }];
    filtro.catch(new BadRequestException({ message: 'Datos inválidos', error: detalle }), host);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Datos inválidos', error: detalle });
  });

  it('un mensaje en forma de arreglo se resume como «Datos inválidos»', () => {
    const { res, host } = contexto();
    filtro.catch(new HttpException({ message: ['a debe ser texto', 'b es obligatorio'] }, 400), host);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Datos inválidos' });
  });

  it('un error inesperado responde 500 con un mensaje genérico, sin filtrar detalles internos', () => {
    const { res, host } = contexto();
    filtro.catch(new Error('ECONNREFUSED 10.0.0.5:5432 password=secreta'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const cuerpo = JSON.stringify(res.json.mock.calls[0][0]);
    expect(cuerpo).toContain('Error interno del servidor');
    expect(cuerpo).not.toContain('ECONNREFUSED');
    expect(cuerpo).not.toContain('secreta');
  });

  it('un cuerpo demasiado grande (error 413 del analizador de Express) responde 413, no 500 (regresión DEF-03)', () => {
    const { res, host } = contexto();
    filtro.catch(Object.assign(new Error('request entity too large'), { status: 413, statusCode: 413, type: 'entity.too.large' }), host);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'La solicitud es demasiado grande' });
  });

  it('un JSON mal formado (error 400 del analizador) responde 400 sin repetir el mensaje interno del analizador', () => {
    const { res, host } = contexto();
    filtro.catch(Object.assign(new SyntaxError('Unexpected token } in JSON at position 13'), { status: 400, statusCode: 400, type: 'entity.parse.failed' }), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('position 13');
  });

  it('un error con estado 5xx NO se trata como error del cliente: sigue siendo 500 genérico', () => {
    const { res, host } = contexto();
    filtro.catch(Object.assign(new Error('fallo interno'), { status: 502 }), host);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('un valor que no es Error (por ejemplo un texto lanzado) también responde 500 genérico', () => {
    const { res, host } = contexto();
    filtro.catch('algo raro', host);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('QueryFailedFilter (errores de PostgreSQL)', () => {
  const filtro = new QueryFailedFilter();
  const error = (code?: string) => Object.assign(new QueryFailedError('SELECT 1', [], new Error('detalle interno del controlador')), { driverError: { code } });

  it('23505 (violación de unicidad) → 409 «El registro ya existe»', () => {
    const { res, host } = contexto();
    filtro.catch(error('23505'), host);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'El registro ya existe' });
  });

  it('23503 (llave foránea) → 409 con mensaje estable', () => {
    const { res, host } = contexto();
    filtro.catch(error('23503'), host);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toMatch(/referencia datos/);
  });

  it('cualquier otro código → 500 sin exponer el error del controlador', () => {
    const { res, host } = contexto();
    filtro.catch(error('42P01'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('detalle interno');
  });

  it('sin código de controlador también responde 500', () => {
    const { res, host } = contexto();
    filtro.catch(error(undefined), host);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
