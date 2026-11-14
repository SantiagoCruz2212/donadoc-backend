import { aZonaDeNegocio, convertirFechas } from './zoned-dates.interceptor';

describe('fechas en la zona horaria de negocio', () => {
  const instante = new Date('2026-11-02T17:43:15.756Z');

  it('muestra el instante en America/Bogota con su desfase (-05:00)', () => {
    expect(aZonaDeNegocio(instante, 'America/Bogota')).toBe('2026-11-02T12:43:15.756-05:00');
  });

  it('respeta otras zonas, por ejemplo UTC y Europe/Madrid', () => {
    expect(aZonaDeNegocio(instante, 'UTC')).toBe('2026-11-02T17:43:15.756+00:00');
    expect(aZonaDeNegocio(instante, 'Europe/Madrid')).toBe('2026-11-02T18:43:15.756+01:00');
  });

  it('convierte fechas dentro de objetos y arreglos, y deja intactos los demás valores', () => {
    const r = convertirFechas({ id: 1, creadoEn: instante, lista: [{ f: instante }], texto: 'x', nulo: null }, 'America/Bogota') as Record<string, unknown>;
    expect(r.creadoEn).toBe('2026-11-02T12:43:15.756-05:00');
    expect((r.lista as { f: string }[])[0].f).toBe('2026-11-02T12:43:15.756-05:00');
    expect(r).toMatchObject({ id: 1, texto: 'x', nulo: null });
  });

  it('una fecha inválida se convierte en null en lugar de romper la respuesta', () => {
    expect(convertirFechas(new Date('no es fecha'), 'America/Bogota')).toBeNull();
  });
});
