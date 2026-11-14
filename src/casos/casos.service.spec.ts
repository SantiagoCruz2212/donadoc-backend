import { NotFoundException } from '@nestjs/common';
import { CasosService } from './casos.service';

const user = { userId: 'u1', organizacionId: 'org-1', rol: 'OPERADOR' };
const dto = { donante: { tipoDocumento: 'CC', numeroDocumento: '1000000001', nombres: 'Juan', apellidos: 'Pérez' } };

/** Fabrica el servicio con un gestor de transacciones y un QueryBuilder simulados. */
function crear(opciones: { donanteExistente?: unknown; casoEnBd?: unknown; filas?: [unknown[], number] } = {}) {
  const guardados: { clase: string; datos: Record<string, unknown> }[] = [];
  const manager = {
    findOne: jest.fn(async () => opciones.donanteExistente ?? null),
    create: jest.fn((clase: { name: string }, datos: Record<string, unknown>) => ({ __clase: clase.name, ...datos })),
    save: jest.fn(async (e: Record<string, unknown>) => {
      guardados.push({ clase: String(e.__clase), datos: e });
      return { ...e, id: e.__clase === 'Donante' ? 'don-1' : 'caso-1', creadoEn: new Date('2026-11-01T10:00:00Z') };
    }),
  };
  const ds = { transaction: jest.fn(async (fn: (m: unknown) => unknown) => fn(manager)) };
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'skip', 'take']) qb[m] = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => opciones.filas ?? [[], 0]);
  const repo = { createQueryBuilder: jest.fn(() => qb), findOne: jest.fn(async () => opciones.casoEnBd ?? null) };
  const audit = { log: jest.fn(async () => undefined) };
  const svc = new CasosService(repo as never, {} as never, ds as never, audit as never);
  return { svc, manager, ds, qb, repo, audit, guardados };
}

describe('CasosService.crear', () => {
  it('crea el donante y el caso en BORRADOR dentro de una transacción', async () => {
    const { svc, ds, guardados } = crear();
    const r = await svc.crear(user, dto);
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(guardados.map((g) => g.clase)).toEqual(['Donante', 'Caso']);
    expect(guardados[1].datos).toMatchObject({ organizacionId: 'org-1', creadoPor: 'u1', estado: 'BORRADOR', donanteId: 'don-1' });
    expect(r.estado).toBe('BORRADOR');
    expect(r.donante?.numeroDocumento).toBe('1000000001');
  });

  it('reutiliza el donante existente de la organización en lugar de duplicarlo', async () => {
    const existente = { id: 'don-9', tipoDocumento: 'CC', numeroDocumento: '1000000001', nombres: 'Juan', apellidos: 'Pérez' };
    const { svc, guardados } = crear({ donanteExistente: existente });
    const r = await svc.crear(user, dto);
    expect(guardados.map((g) => g.clase)).toEqual(['Caso']);
    expect(guardados[0].datos.donanteId).toBe('don-9');
    expect(r.donante?.id).toBe('don-9');
  });

  it('busca el donante restringido a la organización del usuario', async () => {
    const { svc, manager } = crear();
    await svc.crear(user, dto);
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), { where: { organizacionId: 'org-1', tipoDocumento: 'CC', numeroDocumento: '1000000001' } });
  });

  it('aplica valores por defecto: muerteViolenta falso y tipoDonante nulo', async () => {
    const { svc, guardados } = crear();
    await svc.crear(user, dto);
    expect(guardados[1].datos).toMatchObject({ muerteViolenta: false, tipoDonante: null, causaMuerte: null, eliminadoEn: null });
  });

  it('respeta tipoDonante y muerteViolenta cuando se envían', async () => {
    const { svc, guardados } = crear();
    await svc.crear(user, { ...dto, tipoDonante: 'TOTIPOTENCIAL', muerteViolenta: true });
    expect(guardados[1].datos).toMatchObject({ tipoDonante: 'TOTIPOTENCIAL', muerteViolenta: true });
  });

  it('audita la creación del caso', async () => {
    const { svc, audit } = crear();
    await svc.crear(user, dto);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'caso', accion: 'CREAR', entidadId: 'caso-1', organizacionId: 'org-1', usuarioId: 'u1' }));
  });

  it('no devuelve la entidad cruda: solo los campos de la vista', async () => {
    const { svc } = crear();
    const r = (await svc.crear(user, dto)) as unknown as Record<string, unknown>;
    expect(Object.keys(r).sort()).toEqual(['creadoEn', 'donante', 'estado', 'id', 'muerteViolenta', 'tipoDonante']);
    expect(r).not.toHaveProperty('organizacionId');
    expect(r).not.toHaveProperty('creadoPor');
  });
});

describe('CasosService.listar', () => {
  const q = { page: 2, pageSize: 5 };

  it('filtra por organización y excluye los casos eliminados', async () => {
    const { svc, qb } = crear();
    await svc.listar(user, q);
    expect(qb.where).toHaveBeenCalledWith('c.organizacionId = :org AND c.eliminadoEn IS NULL', { org: 'org-1' });
  });

  it('pagina con skip y take y devuelve los metadatos de paginación', async () => {
    const { svc, qb } = crear({ filas: [[], 12] });
    const r = await svc.listar(user, q);
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(r.meta).toEqual({ page: 2, pageSize: 5, total: 12, totalPages: 3 });
  });

  it('ordena del más reciente al más antiguo usando nombres de propiedad (no de columna)', async () => {
    const { svc, qb } = crear();
    await svc.listar(user, q);
    expect(qb.orderBy).toHaveBeenCalledWith('c.creadoEn', 'DESC');
  });

  it('agrega el filtro de estado solo cuando se envía', async () => {
    const a = crear();
    await a.svc.listar(user, q);
    expect(a.qb.andWhere).not.toHaveBeenCalled();
    const b = crear();
    await b.svc.listar(user, { ...q, estado: 'BORRADOR' });
    expect(b.qb.andWhere).toHaveBeenCalledWith('c.estado = :estado', { estado: 'BORRADOR' });
  });
});

describe('CasosService.obtenerEntidad / obtener', () => {
  it('un caso que no existe en la organización es «no encontrado»', async () => {
    const { svc } = crear({ casoEnBd: null });
    await expect(svc.obtenerEntidad(user, 'x')).rejects.toThrow(new NotFoundException('Caso no encontrado'));
  });

  it('un caso eliminado lógicamente es «no encontrado»', async () => {
    const { svc } = crear({ casoEnBd: { id: 'c1', eliminadoEn: new Date() } });
    await expect(svc.obtenerEntidad(user, 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('consulta siempre restringida a la organización del usuario (alcance en un solo punto)', async () => {
    const { svc, repo } = crear({ casoEnBd: { id: 'c1', estado: 'BORRADOR', muerteViolenta: false, tipoDonante: null, eliminadoEn: null } });
    await svc.obtenerEntidad(user, 'c1');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'c1', organizacionId: 'org-1' }, relations: ['donante'] });
  });

  it('obtener devuelve la vista pública del caso', async () => {
    const { svc } = crear({ casoEnBd: { id: 'c1', estado: 'EN_CURSO', muerteViolenta: false, tipoDonante: 'ORGANOS', eliminadoEn: null, creadoEn: new Date(), organizacionId: 'org-1' } });
    const v = await svc.obtener(user, 'c1');
    expect(v).toMatchObject({ id: 'c1', estado: 'EN_CURSO', tipoDonante: 'ORGANOS' });
    expect(v).not.toHaveProperty('organizacionId');
  });
});
