import { BadRequestException } from '@nestjs/common';
import { TenantKeyGuard } from './tenant-key.guard';

function ctx(headers: Record<string, unknown>) {
  const req: Record<string, unknown> = { headers };
  return { req, ctx: { switchToHttp: () => ({ getRequest: () => req }) } as never };
}

describe('TenantKeyGuard (clave pública de organización)', () => {
  it('sin la cabecera X-Tenant-Key responde 400', async () => {
    const g = new TenantKeyGuard({ findActiveByKey: jest.fn() } as never);
    await expect(g.canActivate(ctx({}).ctx)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('si la cabecera no es un texto (por ejemplo repetida) responde 400', async () => {
    const g = new TenantKeyGuard({ findActiveByKey: jest.fn() } as never);
    await expect(g.canActivate(ctx({ 'x-tenant-key': ['a', 'b'] }).ctx)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('con una clave válida deja la organización resuelta en req.tenant', async () => {
    const org = { id: 'org-1' };
    const findActiveByKey = jest.fn(async () => org);
    const { req, ctx: c } = ctx({ 'x-tenant-key': 'pk_a' });
    expect(await new TenantKeyGuard({ findActiveByKey } as never).canActivate(c)).toBe(true);
    expect(findActiveByKey).toHaveBeenCalledWith('pk_a');
    expect(req.tenant).toBe(org);
  });

  it('con una clave desconocida deja req.tenant en nulo y permite continuar (no revela qué organizaciones existen)', async () => {
    const { req, ctx: c } = ctx({ 'x-tenant-key': 'pk_inexistente' });
    expect(await new TenantKeyGuard({ findActiveByKey: jest.fn(async () => null) } as never).canActivate(c)).toBe(true);
    expect(req.tenant).toBeNull();
  });
});
