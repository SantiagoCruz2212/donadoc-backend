import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '@common/types/auth-user';
import { metaDePagina, offsetDe } from '@common/pagination/pagination';
import { Usuario } from '@users/entities/usuario.entity';
import { AuditoriaVista, toAuditoriaVista } from './audit.view';
import { ConsultarAuditoriaQuery } from './dto/consultar-auditoria.query';
import { Auditoria } from './entities/auditoria.entity';

export interface EventoAuditoria {
  organizacionId?: string | null;
  usuarioId?: string | null;
  entidad: string;
  entidadId?: string | null;
  /** CREAR, CONSULTAR, MODIFICAR/EDITAR, ELIMINAR o un evento de dominio (LOGIN, IA_RESPUESTA…). */
  accion: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  ip?: string | null;
  metodo?: string | null;
  ruta?: string | null;
  estadoHttp?: number | null;
}

/** Registra quién hizo qué y cuándo. Un fallo al auditar no debe tumbar la operación principal. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(Auditoria) private readonly repo: Repository<Auditoria>) {}

  async log(e: EventoAuditoria): Promise<void> {
    try {
      await this.repo.insert({
        organizacionId: e.organizacionId ?? null,
        usuarioId: e.usuarioId ?? null,
        entidad: e.entidad,
        entidadId: e.entidadId ?? null,
        accion: e.accion,
        valorAnterior: (e.valorAnterior ?? null) as never,
        valorNuevo: (e.valorNuevo ?? null) as never,
        ip: e.ip ?? null,
        metodo: e.metodo ?? null,
        ruta: e.ruta?.slice(0, 200) ?? null,
        estadoHttp: e.estadoHttp ?? null,
      });
    } catch {
      this.logger.error(`No se pudo registrar el evento ${e.accion} de ${e.entidad}`);
    }
  }

  /** Eventos de la organización del actor (nunca de otras), más recientes primero, con el nombre de quien actuó. */
  async consultar(actor: AuthUser, q: ConsultarAuditoriaQuery): Promise<{ items: AuditoriaVista[]; meta: Record<string, number> }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndMapOne('a.usuario', Usuario, 'u', 'u.id = a.usuarioId')
      .where('a.organizacionId = :org', { org: actor.organizacionId })
      .orderBy('a.creadoEn', 'DESC')
      .skip(offsetDe(q))
      .take(q.pageSize);
    if (q.usuarioId) qb.andWhere('a.usuarioId = :usuarioId', { usuarioId: q.usuarioId });
    if (q.entidad) qb.andWhere('a.entidad = :entidad', { entidad: q.entidad });
    if (q.entidadId) qb.andWhere('a.entidadId = :entidadId', { entidadId: q.entidadId });
    if (q.accion) qb.andWhere('a.accion = :accion', { accion: q.accion });
    if (q.desde) qb.andWhere('a.creadoEn >= :desde', { desde: q.desde });
    if (q.hasta) qb.andWhere('a.creadoEn <= :hasta', { hasta: q.hasta });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((a) => toAuditoriaVista(a as Auditoria & { usuario?: Usuario })), meta: metaDePagina(q, total) };
  }
}
