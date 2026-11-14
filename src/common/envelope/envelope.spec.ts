import { createResponse } from './envelope';

describe('createResponse (formato único de respuesta)', () => {
  it('incluye success y message', () => {
    expect(createResponse('Listo')).toEqual({ success: true, message: 'Listo' });
  });

  it('incluye data cuando se envía', () => {
    expect(createResponse('Caso creado', { id: 'c1' })).toEqual({ success: true, message: 'Caso creado', data: { id: 'c1' } });
  });

  it('conserva valores «falsos» válidos como 0, false y arreglos vacíos', () => {
    expect(createResponse('x', 0)).toHaveProperty('data', 0);
    expect(createResponse('x', false)).toHaveProperty('data', false);
    expect(createResponse('x', [])).toHaveProperty('data', []);
  });

  it('incluye meta (paginación) cuando se envía', () => {
    expect(createResponse('Casos', [], { page: 1, total: 0 })).toEqual({ success: true, message: 'Casos', data: [], meta: { page: 1, total: 0 } });
  });

  it('no incluye la clave data cuando es undefined', () => {
    expect(createResponse('x', undefined)).not.toHaveProperty('data');
  });
});
