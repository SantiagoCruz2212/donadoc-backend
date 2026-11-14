import { UsersService } from './users.service';

function crear() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['where', 'andWhere']) qb[m] = jest.fn(() => qb);
  qb.getOne = jest.fn(async () => ({ id: 'u1' }));
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    exists: jest.fn(async () => true),
    create: jest.fn((x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ ...x, id: 'u-nuevo' })),
  };
  return { svc: new UsersService(repo as never), qb, repo };
}

describe('UsersService', () => {
  it('findActiveByEmail busca por organización y correo sin distinguir mayúsculas', async () => {
    const { svc, qb } = crear();
    await svc.findActiveByEmail('org-1', 'ANA@A.LOCAL');
    expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('LOWER(u.correo) = LOWER(:correo)'), { organizacionId: 'org-1', correo: 'ANA@A.LOCAL' });
  });

  it('findActiveByEmail solo considera usuarios activos y no eliminados', async () => {
    const { svc, qb } = crear();
    await svc.findActiveByEmail('org-1', 'a@a.local');
    expect(qb.andWhere).toHaveBeenCalledWith('u.eliminadoEn IS NULL AND u.estado = :estado', { estado: 'ACTIVO' });
  });

  it('existe consulta con el correo en minúsculas', async () => {
    const { svc, repo } = crear();
    await svc.existe('org-1', 'Ana@A.Local');
    expect(repo.exists).toHaveBeenCalledWith({ where: { organizacionId: 'org-1', correo: 'ana@a.local' } });
  });

  it('crear normaliza el correo a minúsculas y deja el usuario ACTIVO y no eliminado', async () => {
    const { svc, repo } = crear();
    await svc.crear({ organizacionId: 'org-1', correo: 'Ana@A.Local', nombre: 'Ana', rol: 'OPERADOR', perfil: null, hashClave: 'hash' } as never);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ correo: 'ana@a.local', estado: 'ACTIVO', eliminadoEn: null }));
  });
});
