import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthUser, Rol } from '../types/auth-user';

export const IS_PUBLIC = 'isPublic';
/** Exime una ruta del guardia JWT global. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
/** Restringe una ruta o un controlador a ciertos roles (RolesGuard global). Sin @Roles basta con estar autenticado. */
export const Roles = (...roles: Rol[]) =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), ApiForbiddenResponse({ description: `Sin permiso: la operación es solo para los roles ${roles.join(', ')}` }));

/** Usuario autenticado de la solicitud. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});
