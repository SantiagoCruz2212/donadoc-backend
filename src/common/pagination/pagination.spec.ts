import { metaDePagina, offsetDe, PageQueryDto } from './pagination';

const q = (page: number, pageSize: number) => Object.assign(new PageQueryDto(), { page, pageSize });

describe('paginación', () => {
  it('calcula el desplazamiento por página', () => {
    expect(offsetDe(q(1, 20))).toBe(0);
    expect(offsetDe(q(3, 10))).toBe(20);
  });

  it('calcula el total de páginas, con mínimo 1', () => {
    expect(metaDePagina(q(1, 10), 25)).toEqual({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    expect(metaDePagina(q(1, 10), 0).totalPages).toBe(1);
  });
});
