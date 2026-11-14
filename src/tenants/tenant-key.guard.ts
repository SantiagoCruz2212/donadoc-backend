import { BadRequestException, CanActivate, createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Organizacion } from './entities/organizacion.entity';

/**
 * Clave de organización (cabecera pública X-Tenant-Key): SOLO selecciona el tenant.
 * No es secreta ni otorga acceso por sí misma. Si la clave no existe, req.tenant queda en null y el
 * servicio responde igual que ante credenciales incorrectas (no revela qué organizaciones existen).
 */
@Injectable()
export class TenantKeyGuard implements CanActivate {
  constructor(private readonly tenants: TenantsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const clave = req.headers['x-tenant-key'];
    if (!clave || typeof clave !== 'string') throw new BadRequestException('Falta la cabecera X-Tenant-Key');
    req.tenant = await this.tenants.findActiveByKey(clave);
    return true;
  }
}

/** Organización resuelta por el TenantKeyGuard (o null si la clave no corresponde a una organización activa). */
export const Tenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): Organizacion | null => {
  return ctx.switchToHttp().getRequest().tenant ?? null;
});
