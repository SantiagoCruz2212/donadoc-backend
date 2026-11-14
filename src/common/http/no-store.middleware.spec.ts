import { sinCache } from './no-store.middleware';

describe('sinCache', () => {
  it('prohíbe guardar la respuesta en cualquier caché y continúa la cadena', () => {
    const cabeceras: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => (cabeceras[k] = v) };
    const next = jest.fn();
    sinCache({} as never, res as never, next);
    expect(cabeceras).toEqual({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
