import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, ROLES_KEY } from '@common/decorators/decorators';
import { AuthUser, Rol } from '@common/types/auth-user';

/** Guardia global de roles: si la ruta o el controlador declaran @Roles(...), el usuario debe tener uno de ellos. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, targets);
    if (!requeridos || requeridos.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !requeridos.includes(user.rol as Rol)) throw new ForbiddenException('No tiene permiso para esta acción');
    return true;
  }
}
