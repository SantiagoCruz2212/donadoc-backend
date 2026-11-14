import { RedService } from './red.service';

const PERSONALES = ['nombres', 'apellidos', 'numeroDocumento', 'tipoDocumento', 'donante', 'causaMuerte', 'muerteViolenta', 'fechaNacimiento', 'sexo', 'documentos'];

function crear(casosDb: Record<string, unknown>[], componentesDb: Record<string, unknown>[] = []) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['innerJoinAndMapOne', 'where', 'orderBy', 'skip', 'take']) qb[m] = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => [casosDb, casosDb.length]);
  const casos = { createQueryBuilder: jest.fn(() => qb) };
  const componentes = { find: jest.fn(async () => componentesDb) };
  const cfg = { get: (k: string) => ({ OTP_PEPPER: 'pepper-de-prueba-0123456789', APP_TIMEZONE: 'America/Bogota' })[k] };
  return { svc: new RedService(casos as never, componentes as never, cfg as never), qb };
}

describe('RedService.vigentes', () => {
  const propio = { id: 'c-propio', organizacionId: 'org-a', tipoDonante: 'ORGANOS', estado: 'EN_CURSO', creadoEn: new Date('2026-11-08T03:00:00Z'), institucion: { nombre: 'Clínica A' },
    // Aunque la base trajera estos campos, la vista no puede propagarlos:
    donante: { nombres: 'Juan', numeroDocumento: '123' }, causaMuerte: 'TCE', muerteViolenta: true };
  const ajeno = { ...propio, id: 'c-ajeno', organizacionId: 'org-b', institucion: { nombre: 'Clínica B' } };

  it('marca los propios con su identificador y deja en null el de los ajenos', async () => {
    const { svc } = crear([propio, ajeno]);
    const { items } = await svc.vigentes({ userId: 'u', organizacionId: 'org-a', rol: 'OPERADOR' }, { page: 1, pageSize: 20 });
    expect(items.find((i) => i.institucion === 'Clínica A')).toMatchObject({ esPropio: true, casoId: 'c-propio' });
    expect(items.find((i) => i.institucion === 'Clínica B')).toMatchObject({ esPropio: false, casoId: null });
  });

  it('NUNCA expone datos del donante ni de la historia clínica, ni en casos propios ni ajenos', async () => {
    const { svc } = crear([propio, ajeno], [{ casoId: 'c-ajeno', tipoComponente: 'RINON', rescatado: true }]);
    const { items } = await svc.vigentes({ userId: 'u', organizacionId: 'org-a', rol: 'OPERADOR' }, { page: 1, pageSize: 20 });
    const json = JSON.stringify(items);
    for (const campo of PERSONALES) expect(json).not.toContain(`"${campo}"`);
    expect(json).not.toMatch(/Juan|123|TCE/);
    expect(Object.keys(items[0]).sort()).toEqual(['casoId', 'codigo', 'componentes', 'esPropio', 'estado', 'fechaInicio', 'institucion', 'tipoDonante']);
  });

  it('el código público es estable, tiene forma TX-XXXXXXXX y no deja ver el identificador interno', async () => {
    const { svc } = crear([]);
    const a = svc.codigoPublico('c-ajeno');
    expect(a).toMatch(/^TX-[0-9A-F]{8}$/);
    expect(svc.codigoPublico('c-ajeno')).toBe(a);
    expect(svc.codigoPublico('otro')).not.toBe(a);
  });

  it('solo consulta casos vigentes (en curso o firmados) de instituciones activas, no borrados', async () => {
    const { svc, qb } = crear([]);
    await svc.vigentes({ userId: 'u', organizacionId: 'org-a', rol: 'OPERADOR' }, { page: 1, pageSize: 20 });
    expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('eliminadoEn IS NULL'), { estados: ['EN_CURSO', 'FIRMADO'] });
    expect(qb.innerJoinAndMapOne).toHaveBeenCalledWith('c.institucion', expect.anything(), 'o', expect.stringContaining("'ACTIVA'"));
  });

  it('la fecha de inicio se expresa en la zona de negocio (a las 22:00 de Bogotá sigue siendo el mismo día)', async () => {
    const { svc } = crear([{ ...propio, creadoEn: new Date('2026-11-09T03:00:00Z') }]); // 22:00 del 8 de noviembre en Bogotá
    const { items } = await svc.vigentes({ userId: 'u', organizacionId: 'org-a', rol: 'OPERADOR' }, { page: 1, pageSize: 20 });
    expect(items[0].fechaInicio).toBe('2026-11-08');
  });
});
