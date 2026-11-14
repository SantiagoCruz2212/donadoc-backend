import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Caso } from '@casos/entities/caso.entity';
import { ComponenteCaso } from '@casos/entities/componente-caso.entity';
import { aZonaDeNegocio } from '@common/interceptors/zoned-dates.interceptor';
import { metaDePagina, offsetDe, PageQueryDto } from '@common/pagination/pagination';
import { AuthUser } from '@common/types/auth-user';
import { Organizacion } from '@tenants/entities/organizacion.entity';
import { TrasplanteVigenteVista } from './red.view';

/** Un trasplante está vigente mientras el caso está en curso o firmado (ni borrador, ni cerrado, ni contraindicado). */
export const ESTADOS_VIGENTES = ['EN_CURSO', 'FIRMADO'];

@Injectable()
export class RedService {
  constructor(
    @InjectRepository(Caso) private readonly casos: Repository<Caso>,
    @InjectRepository(ComponenteCaso) private readonly componentes: Repository<ComponenteCaso>,
    private readonly cfg: ConfigService,
  ) {}

  /** Código público seudónimo: HMAC del identificador interno con el secreto del servidor, truncado. No es reversible. */
  codigoPublico(casoId: string): string {
    const h = createHmac('sha256', this.cfg.get<string>('OTP_PEPPER') as string).update(`red|${casoId}`).digest('hex');
    return `TX-${h.slice(0, 8).toUpperCase()}`;
  }

  /** Trasplantes vigentes de TODAS las instituciones activas, sin datos del donante ni de la historia clínica. */
  async vigentes(user: AuthUser, q: PageQueryDto): Promise<{ items: TrasplanteVigenteVista[]; meta: Record<string, number> }> {
    const qb = this.casos
      .createQueryBuilder('c')
      .innerJoinAndMapOne('c.institucion', Organizacion, 'o', "o.id = c.organizacionId AND o.estado = 'ACTIVA'")
      .where('c.estado IN (:...estados) AND c.eliminadoEn IS NULL', { estados: ESTADOS_VIGENTES })
      .orderBy('c.creadoEn', 'DESC')
      .skip(offsetDe(q))
      .take(q.pageSize);
    const [casos, total] = await qb.getManyAndCount();
    const ids = casos.map((c) => c.id);
    const comps = ids.length ? await this.componentes.find({ where: { casoId: In(ids) } }) : [];
    const items = casos.map((c) => {
      const org = (c as Caso & { institucion: Organizacion }).institucion;
      const propio = c.organizacionId === user.organizacionId;
      return {
        codigo: this.codigoPublico(c.id),
        institucion: org.nombre,
        esPropio: propio,
        casoId: propio ? c.id : null,
        tipoDonante: c.tipoDonante,
        estado: c.estado,
        fechaInicio: aZonaDeNegocio(c.creadoEn, this.cfg.get<string>('APP_TIMEZONE') ?? 'America/Bogota').slice(0, 10),
        componentes: comps.filter((k) => k.casoId === c.id).map((k) => ({ tipoComponente: k.tipoComponente, rescatado: k.rescatado })),
      };
    });
    return { items, meta: metaDePagina(q, total) };
  }
}
