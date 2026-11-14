import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, ROLES_KEY } from '@common/decorators/decorators';
import { RolesGuard } from './roles.guard';

function contexto(user: unknown) {
  return { getHandler: () => 'h', getClass: () => 'c', switchToHttp: () => ({ getRequest: () => ({ user }) }) } as never;
}
function guardia(metadata: Record<string, unknown>) {
  const reflector = { getAllAndOverride: (k: string) => metadata[k] } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('deja pasar una ruta pública', () => {
    expect(guardia({ [IS_PUBLIC]: true }).canActivate(contexto(undefined))).toBe(true);
  });

  it('sin @Roles basta con estar autenticado', () => {
    expect(guardia({}).canActivate(contexto({ rol: 'OPERADOR' }))).toBe(true);
  });

  it('permite un rol incluido y rechaza uno que no lo está', () => {
    const g = guardia({ [ROLES_KEY]: ['ADMIN_ORG', 'OPERADOR'] });
    expect(g.canActivate(contexto({ rol: 'OPERADOR' }))).toBe(true);
    expect(() => g.canActivate(contexto({ rol: 'SUPER_ADMIN' }))).toThrow(ForbiddenException);
  });

  it('rechaza si no hay usuario en la solicitud', () => {
    expect(() => guardia({ [ROLES_KEY]: ['ADMIN_ORG'] }).canActivate(contexto(undefined))).toThrow(ForbiddenException);
  });
});
