import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, concatMap, from, Observable, throwError } from 'rxjs';
import { AuthUser } from '@common/types/auth-user';
import { AuditService } from './audit.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deduce qué registro se consultó a partir del patrón de la ruta (/api/v1/casos/:casoId/documentos):
 * la entidad es el último segmento fijo y el identificador, el último parámetro de la ruta si es un UUID.
 */
export function rastroDeRuta(patron: string, params: Record<string, string>): { entidad: string; entidadId: string | null } {
  const segmentos = patron.split('/').filter(Boolean).filter((s) => s !== 'api' && !/^v\d+$/.test(s));
  const fijos = segmentos.filter((s) => !s.startsWith(':'));
  const nombresParam = segmentos.filter((s) => s.startsWith(':')).map((s) => s.slice(1));
  const ultimo = nombresParam.length ? params[nombresParam[nombresParam.length - 1]] : undefined;
  return { entidad: fijos[fijos.length - 1] ?? 'raiz', entidadId: ultimo && UUID.test(ultimo) ? ultimo : null };
}

/**
 * Deja constancia de TODA consulta (GET) hecha con sesión, y también de los intentos fallidos (404, 403…).
 * El evento se guarda antes de responder, de modo que no hay lectura sin rastro. Las escrituras las registra el
 * servicio de cada módulo porque conoce el valor anterior y el nuevo.
 */
@Injectable()
export class AuditoriaLecturasInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    if (req.method !== 'GET' || !user) return next.handle(); // salud, login y rutas públicas no tienen usuario

    const { entidad, entidadId } = rastroDeRuta(req.route?.path ?? req.path, req.params ?? {});
    const registrar = (estadoHttp: number) =>
      this.audit.log({
        organizacionId: user.organizacionId,
        usuarioId: user.userId,
        entidad,
        entidadId,
        accion: 'CONSULTAR',
        ip: req.ip,
        metodo: req.method,
        ruta: String(req.originalUrl ?? req.url).split('?')[0],
        estadoHttp,
      });

    return next.handle().pipe(
      concatMap((cuerpo) => from(registrar(ctx.switchToHttp().getResponse().statusCode ?? 200)).pipe(concatMap(() => [cuerpo]))),
      catchError((err) =>
        from(registrar(err instanceof HttpException ? err.getStatus() : 500)).pipe(concatMap(() => throwError(() => err))),
      ),
    );
  }
}
